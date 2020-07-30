# Releasing

Once all the changes for a release have been merged to master, ensure the following:

- [ ] tests are passing
- [ ] user facing documentation has been updated

## Publish Release

To make a release, do these steps

1. Open a PR to update the CHANGELOG and then merge to master
1. Run `make release RELEASE_TYPE=major|minor|patch`

`make release` does the following:

- Updates the package version based on the `RELEASE_TYPE` and commits the change
- Creates a tag for the newly created version
- Pushes the version bump commit and new tag to upstream
- The tag triggers a build and release from CircleCI to NPM
