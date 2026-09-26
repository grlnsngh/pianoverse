// Run the tests in the app's users' time zone (India), where date bugs show up
// that a UTC machine hides. Workers inherit this.
module.exports = () => {
  process.env.TZ = "Asia/Kolkata";
};
