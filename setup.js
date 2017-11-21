// Note: this file is the configuration file *only* for
// use by the boiler-room-custodian utility. the point
// of the boiler-room-custodian is to clean sample code
// from the boilerplate from initial state so that you
// can start custom development on a "blank project"
//
// For more information or to report issues please go
// to https://github.com/tstringer/boiler-room-custodian
//
// This file should remain unmodified by end users and
// should only be invoked by running `npm run cleanup`
module.exports = {

  // add the following files to the project, mostly
  // related to .gitkeep for version control
  add: [
    { file: 'app/actions/.gitkeep' },
    { file: 'test/actions/.gitkeep' },
    { file: 'test/components/.gitkeep' },
    { file: 'test/containers/.gitkeep' },
    { file: 'test/reducers/.gitkeep' }
  ]
};
