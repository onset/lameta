// notarize the mac version and attach the ticket
// This expects to find an environment variable APPLEID, and a keychain entry "altoolpw" with a app-specific password you made for altool from appid.apple.com.

// to test notarization by hand, do something like:
// xcrun altool --verbose --notarize-app -f "lameta-0.7.5-mac.zip" --primary-bundle-id "io.github.saymore.lameta" -u "<your apple id>" -p "@keychain:altoolpw"

const keychain = require("keychain");
const { notarize } = require("electron-notarize");

exports.default = async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  if (electronPlatformName !== "darwin") {
    return;
  }
  const appName = context.packager.appInfo.productFilename;

  //return; // DON'T notarize

  const pass = await new Promise(function (resolve, reject) {
    keychain.getPassword(
      { account: process.env.APPLEID, service: "altoolpw" },
      function (err, password) {
        if (err) {
          console.log("err=" + err);
          return reject(err);
        }
        resolve(password);
      }
    );
  });

  const params = {
    appBundleId: "io.github.onset.lameta",
    appPath: `${appOutDir}/${appName}.app`,
    appleId: process.env.APPLEID,
    appleIdPassword: pass,
  };
  console.log(`calling notarize(${JSON.stringify(params)})`);
  console.log(
    "This takes a long time (like 10 minutes or so), because it waits for the notarization to finish at Apple before proceeding."
  );
  return await notarize(params);
};
