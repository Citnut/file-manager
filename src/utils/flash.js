"use strict";

/**
 * Build a context object with flash messages attached.
 */
function flashify(req, obj) {
  const error = req.flash("error");
  if (error && error.length > 0) {
    obj.errors = (obj.errors || []).concat(error);
  }
  const success = req.flash("success");
  if (success && success.length > 0) {
    obj.successes = (obj.successes || []).concat(success);
  }
  obj.isloginenabled = !!req.app.locals.keyEnabled;
  return obj;
}

module.exports = { flashify };