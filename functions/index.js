const functions = require("firebase-functions");
const https = require("https");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});

const db = admin.firestore();

exports.getPaymentLink = functions.https.onRequest((request, response) => {
  let result;
  if (request.body["email"] == null || request.body["amount"] == null) {
    response.send({
      status: false,
    });
  }
  const number = parseFloat(request.body["amount"]);
  // eslint-disable-next-line max-len
  const rounded = number + 6755399441055744.0 - 6755399441055744.0;
  const params = JSON.stringify({
    email: request.body["email"],
    amount: rounded * 100,
    callback_url: "https://standard.paystack.co/close",
  });
  const options = {
    hostname: "api.paystack.co",
    port: 443,
    path: "/transaction/initialize",
    method: "POST",
    headers: {
      // eslint-disable-next-line max-len
      Authorization: "Bearer sk_test_7dc4187b7e2bb6084d9daabbe3a155b5d21a18bd",
      "Content-Type": "application/json",
    },
  };
  const req = https
    .request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        result = JSON.parse(data);
        response.send(result);
      });
    })
    .on("error", (error) => {
      console.error(error);
      response.status(404).send(error);
    });
  req.write(params);
  req.end();
});

exports.verifyPayment = functions.https.onRequest((request, response) => {
  const ref = request.body["ref"];
  const options = {
    hostname: "api.paystack.co",
    port: 443,
    path: `/transaction/verify/${ref}`,
    method: "GET",
    headers: {
      Authorization: "Bearer sk_test_7dc4187b7e2bb6084d9daabbe3a155b5d21a18bd",
    },
  };
  const req = https
    .request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        console.log(JSON.parse(data));
        response.send(JSON.parse(data));
      });
    })
    .on("error", (error) => {
      console.error(error);
    });
  req.end();
});

exports.sendNotification = functions.https.onRequest(
  async (request, response) => {
    if (request.body["pushToken"] == null) {
      response.send({
        status: false,
        message: "pushtoken is invalid",
      });
    }
    // eslint-disable-next-line max-len
    const otp = request.body["otp"];
    const pushToken = request.body["pushToken"];
    const data = request.body["data"];
    const data1 = JSON.parse(data);
    const creatorid = request.body["user"];
    const isUser = await db
      .collection("users")
      .where("id", "==", creatorid)
      .get();
    const user = [];
    await isUser.forEach((doc) => {
      user.push(doc.data());
    });
    const today = new Date();
    const time = today.getHours() + ":" + today.getMinutes();
    const notify = user[0]["notification"];
    const message = {
      notification: {
        title: `Driver is on its ways. Your Otp is ` + otp,
        body:
`Time: `+ time+
`Name: ` +data1["name"] +
`
Phone number: 3989899889
Car Name: Nissan
Car color: red`,
      },
      android: {
        notification: {
          click_action: "FLUTTER_NOTIFICATION_CLICK",
        },
      },
      apns: {
        payload: {
          aps: {
            category: "INVITE_CATEGORY",
          },
        },
      },
      token: pushToken,
    };
    notify.push(message["notification"]);
    const userRef = db.collection("users").doc(creatorid);
    const res = await userRef.update({
      notification: notify,
    });
    admin
      .messaging()
      .send(message)
      .then((res) => {
        // Response is a message ID string.
        response.send({
          status: true,
          response: res,
        });
      })
      .catch((error) => {
        response.send({
          status: false,
          error: error,
        });
      });
  }
);
const app = express();
app.use(
  cors({
    origin: true,
  })
);
app.get("/", function (req, res) {
  res.sendFile("views/policy.html", { root: __dirname });
});
exports.policy = functions.https.onRequest(app);
