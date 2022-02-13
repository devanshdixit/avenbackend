const functions = require("firebase-functions");
const https = require("https");
const admin = require("firebase-admin");
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});
const paystackApi = require('./paystackapi');
const db = admin.firestore();

exports.paystackapi = functions.https.onRequest(paystackApi);

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
          `Time: ` +
          time +
          `Name: ` +
          data1["name"] +
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
    await admin
      .messaging()
      .send(message)
      .then((res) => {
        console.log("notified user");
        response.send({
          status: true,
          data: res,
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

exports.policy = functions.https.onRequest((request, response) => {
  response.sendFile("views/policy.html", { root: __dirname });
});

exports.notifywhenbooking = functions.https.onRequest(
  async (request, response) => {
    const getDrivers = await db.collection("riders").get();
    const registrationTokens = [];
    getDrivers.docs.map((doc, index) => {
      const element = doc.data();
      const token = element["pushToken"];
      registrationTokens.push(token);
    });
    console.log("total tokens: " + registrationTokens.length);
    const messsage = {
      notification: {
        title: "There is a new Booking on AvenRide!",
        body: "Open the app to start taking rides",
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
      tokens: registrationTokens,
    };
    await admin
      .messaging()
      .sendMulticast(messsage)
      .then((res) => {
        console.log(res.successCount + " messages were sent successfully");
        response.send({
          status: true,
          response: res.successCount + " messages were sent successfully",
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
