// Every test starts with the token photos are loaded with already made, as the
// app has it a moment after signing in (lib/photoAuth.ts): a photo is drawn at
// once. Tests of the moment before it, or without a connection, take it away.
beforeEach(() => {
  require("@/lib/photoAuth").setPhotoTokenForTests("test-jwt");
});
