const express = require("express");
const { userAuth } = require("../middlewares/auth");
const profileRouter = express.Router();
const {
  validateEditProfileData,
  validatePasswordUpdate,
} = require("../utils/validation");
const bcrypt = require("bcrypt");

profileRouter.get("/profile/view", userAuth, async (req, res) => {
  try {
    const user = req.user;
    res.send(user);
  } catch (err) {
    res.status(400).send("Error" + err.message);
  }
});

profileRouter.patch("/profile/edit", userAuth, async (req, res) => {
  try {
    if (!validateEditProfileData(req)) {
      throw new Error("Invalid Edit Request");
    }
    const loggedInUser = req.user;

    Object.keys(req.body).forEach((key) => (loggedInUser[key] = req.body[key]));
    await loggedInUser.save();

    res.json({
      message: `${loggedInUser.firstName}, your profile updated successfully`,
      data: loggedInUser,
    });
  } catch (err) {
    res.status(400).send("Error: " + err.message);
  }
});

profileRouter.patch("/profile/password/update", userAuth, async (req, res) => {
  try {
    validatePasswordUpdate(req);
    const { currentPassword, newPassword } = req.body;
    const loggedInUser = req.user;

    const isCurrentPasswordValid =
      await loggedInUser.validatePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      throw new Error("Current password is incorrect");
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    loggedInUser.password = passwordHash;

    await loggedInUser.save();
    res.send("Password updated successfully!");
  } catch (err) {
    res.status(400).send("Error: " + err.message);
  }
});

module.exports = profileRouter;
