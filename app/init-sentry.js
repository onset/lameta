const { init, showReportDialog } = require("@sentry/electron");

exports.initializeSentry = () => {
  init({
    dsn: "https://14749f18cf3c4d828e341593bc1b568e@sentry.io/1300542",
    enableNative: false, // from the docs
    debug: true,
    release: require("./package.json").version
    // this doesn't work yet. Reported here: https://github.com/getsentry/sentry-electron/issues/129
    // oddly, it might also prevent the event from showing, though as a UI thing, this will return before
    // the dialog itself gets loaded.
    // ,beforeSend(event) {
    //   if (event.exception) {
    //     showReportDialog({user: { email: "me@example.com", name: "me again" }});
    //   }
    //   return event;
    // }
  });
};
