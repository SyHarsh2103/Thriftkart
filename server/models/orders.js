const mongoose = require('mongoose');

const ordersSchema = mongoose.Schema({
    orderId: {
        type: String,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    phoneNumber: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    pincode: {
        type: String,
        required: true
    },
    amount: {
        type: String,
        required: true
    },
    paymentId: {
        type: String,
        required: true
    },
    paymentType: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    userid: {
        type: String,
        required: true
    },
    products: [
        {
            productId:{
                type:String
            },
            productTitle: {
                type: String
            },
            quantity:{
                type:Number
            },
            price:{
                type:Number
            },
            image:{
                type:String
            },
            subTotal:{
                type:Number
            }
        }
    ],
    status:{
        type:String,
        default:"pending"
    },
    date: {
        type: Date,
        default: Date.now
    },

})

ordersSchema.virtual('id').get(function () {
    return this._id.toHexString();
});

// Function to generate unique 6-character ID (2 letters + 4 digits)
function generateUniqueOrderId() {
    const letters = 'TKOR';
    const randomNumbers = Math.floor(1000 + Math.random() * 9000); // Ensures 4-digit number
    return letters + randomNumbers;
}

// Pre-save middleware to set orderId before saving
ordersSchema.pre('save', function (next) {
    if (!this.orderId) {
        this.orderId = generateUniqueOrderId();
    }
    next();
});

ordersSchema.set('toJSON', {
    virtuals: true,
});

exports.Orders = mongoose.model('Orders', ordersSchema);
exports.ordersSchema = ordersSchema;
