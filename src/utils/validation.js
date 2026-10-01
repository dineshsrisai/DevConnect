const validator = require("validator");

const validateSignUpData = (req) => {
  const { firstName, lastName, emailId, password } = req.body;
  if (!firstName || !lastName) {
    throw new Error("Name is invalid");
  } else if (!validator.isEmail(emailId)) {
    throw new Error("Invalid Email Address");
  } else if (!validator.isStrongPassword(password)) {
    throw new Error("Please Enter A Strong Password");
  }
};

const validateEditProfileData = (req) => {
  const allowedEditFields = [
    "firstName",
    "lastName",
    "emailId",
    "photoUrl",
    "gender",
    "age",
    "about",
    "skills",
  ];
  const isEditAllowed = Object.keys(req.body).every((field) =>
    allowedEditFields.includes(field)
  );
  return isEditAllowed;
};

const validatePasswordUpdate = (req) => {
  // FIX: now also requires currentPassword (used by routes/profile.js to
  // verify identity before allowing the change) — previously only
  // newPassword was checked here.
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword) {
    throw new Error("Current password is required");
  }
  if (!newPassword) {
    throw new Error("New Password is required");
  }
  if (!validator.isStrongPassword(newPassword)) {
    throw new Error("Please enter a strong password");
  }
  return true;
};

module.exports = {
  validateSignUpData,
  validateEditProfileData,
  validatePasswordUpdate,
};
