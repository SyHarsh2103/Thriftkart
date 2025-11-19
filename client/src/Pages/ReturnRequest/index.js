// client/src/Pages/ReturnRequest/index.js
import { useContext, useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { fetchDataFromApi, postData } from "../../utils/api";
import { MyContext } from "../../App";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";

const reasonOptions = [
  { value: "DAMAGED_OR_DEFECTIVE", label: "Damaged or defective" },
  { value: "WRONG_ITEM_RECEIVED", label: "Wrong item received" },
  { value: "SIZE_OR_FIT_ISSUE", label: "Size / fit issue" },
  { value: "QUALITY_NOT_AS_EXPECTED", label: "Quality not as expected" },
  { value: "DELIVERY_ISSUE", label: "Delivery issue" },
  { value: "CHANGED_MIND", label: "Changed my mind" },
  { value: "OTHER", label: "Other" },
];

const resolutionOptions = [
  { value: "REFUND", label: "Refund" },
  { value: "REPLACEMENT", label: "Replacement" },
  { value: "STORE_CREDIT", label: "Store credit" },
];

const ReturnRequest = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [selectedItems, setSelectedItems] = useState({});
  const [reason, setReason] = useState("DAMAGED_OR_DEFECTIVE");
  const [reasonText, setReasonText] = useState("");
  const [resolution, setResolution] = useState("REFUND");
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const context = useContext(MyContext);
  const navigate = useNavigate();

  // require login
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/signIn");
    }
  }, [navigate]);

  useEffect(() => {
    if (!orderId) return;

    setLoadingOrder(true);
    fetchDataFromApi(`/api/orders/${orderId}`)
      .then((res) => {
        setOrder(res);
      })
      .catch((err) => {
        console.error("load order error:", err);
        context.setAlertBox({
          open: true,
          error: true,
          msg: err.message || "Failed to load order",
        });
      })
      .finally(() => setLoadingOrder(false));
  }, [orderId, context]);

  const toggleItem = (idx) => {
    setSelectedItems((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!order) return;

    const items = (order.products || [])
      .map((item, index) => ({ item, index }))
      .filter(({ index }) => selectedItems[index])
      .map(({ item }) => ({
        productId: item.productId,
        productTitle: item.productTitle,
        image: item.image,
        quantity: item.quantity,
        price: item.price,
        subTotal: item.subTotal,
      }));

    if (items.length === 0) {
      return context.setAlertBox({
        open: true,
        error: true,
        msg: "Please select at least one item to return.",
      });
    }

    try {
      setSubmitting(true);
      const payload = {
        orderId,
        items,
        reason,
        reasonText,
        resolution,
      };

      const res = await postData("/api/returns", payload);
      if (res?.success) {
        context.setAlertBox({
          open: true,
          error: false,
          msg: res.msg || "Return request submitted.",
        });
        navigate("/my-returns");
      } else {
        context.setAlertBox({
          open: true,
          error: true,
          msg: res?.msg || "Failed to submit request.",
        });
      }
    } catch (err) {
      console.error("create return error:", err);
      context.setAlertBox({
        open: true,
        error: true,
        msg: err.message || "Failed to submit request.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingOrder) {
    return (
      <div className="container py-5 text-center">
        <CircularProgress />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container py-5 text-center">
        <p>Order not found.</p>
        <Link to="/orders" className="btn btn-primary">
          Back to Orders
        </Link>
      </div>
    );
  }

  return (
    <section className="section py-4">
      <div className="container">
        <h3 className="mb-3">Return Request for Order #{order._id}</h3>
        <p className="text-muted mb-4">
          Select the items you want to return and provide details.
        </p>

        <form onSubmit={handleSubmit}>
          {/* Products table */}
          <div className="card mb-4 p-3">
            <h5>Items in this order</h5>
            <div className="table-responsive mt-3">
              <table className="table table-bordered">
                <thead>
                  <tr>
                    <th></th>
                    <th>Product</th>
                    <th>Qty</th>
                    <th>Price</th>
                    <th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {order.products?.map((item, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          type="checkbox"
                          checked={!!selectedItems[index]}
                          onChange={() => toggleItem(index)}
                        />
                      </td>
                      <td style={{ whiteSpace: "normal" }}>
                        <div className="d-flex align-items-center">
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.productTitle}
                              style={{
                                width: 50,
                                height: 50,
                                objectFit: "cover",
                                marginRight: 8,
                              }}
                            />
                          )}
                          <span>{item.productTitle}</span>
                        </div>
                      </td>
                      <td>{item.quantity}</td>
                      <td>{item.price}</td>
                      <td>{item.subTotal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Reason & Resolution */}
          <div className="card mb-4 p-3">
            <h5>Reason & Resolution</h5>
            <div className="row mt-3">
              <div className="col-md-6 mb-3">
                <label className="mb-1">Reason</label>
                <Select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-100"
                  size="small"
                >
                  {reasonOptions.map((r) => (
                    <MenuItem key={r.value} value={r.value}>
                      {r.label}
                    </MenuItem>
                  ))}
                </Select>
              </div>
              <div className="col-md-6 mb-3">
                <label className="mb-1">Preferred Resolution</label>
                <Select
                  value={resolution}
                  onChange={(e) => setResolution(e.target.value)}
                  className="w-100"
                  size="small"
                >
                  {resolutionOptions.map((r) => (
                    <MenuItem key={r.value} value={r.value}>
                      {r.label}
                    </MenuItem>
                  ))}
                </Select>
              </div>
              <div className="col-md-12 mb-2">
                <TextField
                  label="Additional details (optional)"
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  multiline
                  minRows={3}
                  className="w-100"
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="btn-blue btn-lg"
            disabled={submitting}
          >
            {submitting ? (
              <CircularProgress size={22} color="inherit" />
            ) : (
              "Submit Return Request"
            )}
          </Button>

          <Link to="/orders" className="btn btn-link ml-3">
            Cancel
          </Link>
        </form>
      </div>
    </section>
  );
};

export default ReturnRequest;
