import React, { useContext, useEffect, useState } from "react";
import Button from "@mui/material/Button";
import { FaPencilAlt } from "react-icons/fa";
import { MdDelete } from "react-icons/md";
import { MyContext } from "../../App";
import { Link } from "react-router-dom";
import { emphasize, styled } from "@mui/material/styles";
import Breadcrumbs from "@mui/material/Breadcrumbs";
import Chip from "@mui/material/Chip";
import HomeIcon from "@mui/icons-material/Home";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { deleteData, fetchDataFromApi } from "../../utils/api";

const StyledBreadcrumb = styled(Chip)(({ theme }) => {
  const backgroundColor =
    theme.palette.mode === "light"
      ? theme.palette.grey[100]
      : theme.palette.grey[800];
  return {
    backgroundColor,
    height: theme.spacing(3),
    color: theme.palette.text.primary,
    fontWeight: theme.typography.fontWeightRegular,
    "&:hover, &:focus": { backgroundColor: emphasize(backgroundColor, 0.06) },
    "&:active": { boxShadow: theme.shadows[1], backgroundColor: emphasize(backgroundColor, 0.12) },
  };
});

const SubCategory = () => {
  const [subCatData, setSubCatData] = useState([]);
  const context = useContext(MyContext);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    context.setProgress(30);
    fetchDataFromApi("/api/subCat").then((res) => {
      setSubCatData(res.subCategoryList);
      context.setProgress(100);
    });
  };

  const deleteSubCat = (id) => {
    context.setProgress(30);
    deleteData(`/api/subCat/${id}`).then(() => {
      fetchData();
      context.setAlertBox({
        open: true,
        error: false,
        msg: "Sub Category Deleted!",
      });
    });
  };

  return (
    <div className="right-content w-100">
      <div className="card shadow border-0 w-100 flex-row p-4 align-items-center">
        <h5 className="mb-0">Sub Category List</h5>
        <div className="ml-auto d-flex align-items-center">
          <Breadcrumbs aria-label="breadcrumb" className="ml-auto breadcrumbs_">
            <StyledBreadcrumb component="a" href="#" label="Dashboard" icon={<HomeIcon fontSize="small" />} />
            <StyledBreadcrumb label="Sub Category" deleteIcon={<ExpandMoreIcon />} />
          </Breadcrumbs>
          <Link to="/subCategory/add">
            <Button className="btn-blue ml-3 pl-3 pr-3">Add Sub Category</Button>
          </Link>
        </div>
      </div>

      <div className="card shadow border-0 p-3 mt-4">
        <div className="table-responsive mt-3">
          <table className="table table-bordered table-striped v-align">
            <thead className="thead-dark">
              <tr>
                <th>CATEGORY</th>
                <th>SUB CATEGORY</th>
                <th>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {subCatData?.length > 0 ? (
                subCatData.map((item, index) => (
                  <tr key={index}>
                    <td>{item.category?.name}</td>
                    <td>{item.subCat}</td>
                    <td>
                      <div className="actions d-flex align-items-center">
                        {/* ✅ Edit Button */}
                        <Link to={`/subCategory/edit/${item._id}`}>
                          <Button className="success" color="success">
                            <FaPencilAlt />
                          </Button>
                        </Link>

                        {/* ✅ Delete Button */}
                        <Button
                          className="error"
                          color="error"
                          onClick={() => deleteSubCat(item._id)}
                        >
                          <MdDelete />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="text-center">No sub categories found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SubCategory;
