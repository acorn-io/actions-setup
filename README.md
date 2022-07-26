# actions-setup

<p align="left">
  <a href="https://github.com/acorn-io/actions-setup"><img alt="GitHub Actions status" src="https://github.com/acorn-io/actions-setup/workflows/Main%20workflow/badge.svg"></a>
</p>

GitHub action to install Acorn CLI and spin up a k3s cluster

# Usage

```yaml
steps:
- uses: actions/checkout@master
- uses: acorn-io/actions-setup@v1
- run: |
  acorn version # acorn build, acorn run, etc
```

# Options

| Key             | Default  | Description |
| --------------- | ---------| ----------- |
| `acorn-version` | `latest` | Version of Acorn to install
| `acorn-init`    | `true`   | Should the acorn runtime beinstalled into the cluster
| `k3s-install`   | `true`   | Whether to spin up a container running k3s for acorn to run in
| `k3s-version`   | `latest` | Version of K3s to install
| `k3s-cleanup`   | `true`   | Whether to cleanup the k3s container after job completion

# License

Copyright (c) 2022 Acorn Labs, Inc.

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
