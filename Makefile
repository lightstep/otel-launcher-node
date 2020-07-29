# release
#
# NOTE: `npm version` automatically creates a git commit and git tag for the
# incremented version
.PHONY: release
release:
	@if [ $(shell git symbolic-ref --short -q HEAD) = "master" ]; then exit 0; else \
		echo "Current git branch does not appear to be 'master'. Refusing to publish."; exit 1; \
	fi
	npm version $(RELEASE_TYPE)
	npm run release:prepare
	@echo
	@echo "Version and tag created. The publish will be done automatically from circleCI."
	@echo
