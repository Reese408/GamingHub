// Middleware to ensure the user is authenticated
module.exports.ensureAuthenticated = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next(); // User is authenticated, proceed to the next middleware/route
  }
  // User is not authenticated, redirect to login page
  res.redirect('/login');
};
