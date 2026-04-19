const express = require("express");
const axios = require("axios");
const cors = require("cors");
const Razorpay = require("razorpay");



const app = express();

// ✅ MIDDLEWARE
app.use(express.json());
app.use(cors());


// razorpay 
const razorpay = new Razorpay({
  key_id: "rzp_live_SfL1c813qJNduP",
  key_secret: "261xmmqiDYpbgxgQUIm84xhj"
});

// razorpay integration 
app.post("/create-razorpay-order", async (req, res) => {
  try {
    console.log("BODY:", req.body);

    const amount = Math.round(Number(req.body.amount) * 100);

    if(!amount){
      return res.status(400).send("Invalid amount");
    }

    const options = {
      amount: amount,
      currency: "INR",
      receipt: "order_" + Date.now()
    };

    const order = await razorpay.orders.create(options);

    res.json(order);

  } catch (err) {
    console.log("❌ RAZORPAY ERROR:", err);
    res.status(500).send(err.message);
  }
});

// 🔥 DEBUG (हर request print होगी)
app.use((req, res, next) => {
  console.log(`🔥 ${req.method} ${req.url}`);
  next();
});

// ✅ ROOT ROUTE (browser test ke liye)
app.get("/", (req, res) => {
  console.log("🔥 ROOT HIT");
  res.send("Server is running 🚀");
});

// ✅ TEST ROUTE
app.get("/ping", (req, res) => {
  console.log("🔥 PING HIT");
  res.send("pong");
});

// 🔐 SHIPROCKET TOKEN FUNCTION
async function getToken() {
  try {
    const response = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/auth/login",
      {
        email: "iuse.tiwari@gmail.com",
        password: "177^hdTjUgkOsJPRMA!&2WdsP#W9zstw" // 🔴 yahan apna password daal
      }
    );

    console.log("✅ Token generated");
    return response.data.token;

  } catch (err) {
    console.log("❌ TOKEN ERROR:", err.response?.data || err.message);
    throw new Error("Token failed");
  }
}

// 🚀 CREATE ORDER ROUTE
app.post("/create-order", async (req, res) => {

  try {
    console.log("📦 DATA RECEIVED:", req.body);

    const token = await getToken();
    const order = req.body;
   // 🔥 NAME SPLIT FIX
    const nameParts = order.name.split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || "NA";

    const response = await axios.post(
      "https://apiv2.shiprocket.in/v1/external/orders/create/adhoc",
      {
        order_id: "ORD" + Date.now(),
        order_date: new Date().toISOString().split("T")[0],

        // ⚠️ EXACT NAME (Shiprocket dashboard se)
        pickup_location: "Home",
        
        billing_customer_name: firstName,
        billing_last_name: lastName,
        billing_phone: order.phone,
        billing_address: order.address,
        billing_city: order.city,
        billing_pincode: order.pincode,
        billing_state: order.state,
        billing_country: "India",

        shipping_is_billing: true,

        order_items: order.items.map(item => ({
          name: item.name,
          sku: item.name,
          units: item.qty,
          selling_price: item.price
        })),

        payment_method: "Prepaid",
        sub_total: order.total,

        length: 10,
        breadth: 10,
        height: 12,
        weight: 0.8
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        }
      }
    );

    console.log("🚀 ORDER CREATED:", response.data);

    res.json({
      success: true,
      data: response.data
    });

  } catch (err) {
    console.log("❌ SHIPROCKET ERROR:", err.response?.data || err.message);

    res.status(500).json({
      success: false,
      error: err.response?.data || err.message
    });
  }
});

// 🚀 SERVER START
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT}`);
});