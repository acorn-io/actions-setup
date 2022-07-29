# actions-setup

[![build-test](https://github.com/acorn-io/actions-setup/actions/workflows/test.yml/badge.svg)](https://github.com/acorn-io/actions-setup/actions/workflows/test.yml)

GitHub action to install Acorn CLI and spin up a k3s cluster

# Quick Start

```yaml
name: My Workflow
on:
  push: {}
jobs:
  publish:
    steps:
    - uses: actions/checkout@master
    - uses: acorn-io/actions-setup@v1
    - run: |
      acorn --version # acorn build, acorn run, etc
```

# Options

| Key             | Default    | Description |
| --------------- | -----------| ----------- |
| `acorn-init`    | `true`     | Run `acorn init` to install the runtime into the cluster
| `acorn-version` | `"latest"` | Version of Acorn to install
| `k3s-cleanup`   | `true`     | Cleanup the k3s container after job completion
| `k3s-install`   | `true`     | Spin up a container running k3s for acorn to run in
| `k3s-version`   | `"latest"` | Version of K3s to install

# Bring-your-own-Cluster

If you already have a cluster to run Acorn against, you can point to it instead of spinning up k3s:

```yaml
name: My Workflow
on:
  push: {}
jobs:
  publish:
    steps:
    - uses: actions/checkout@master
    - uses: acorn-io/actions-setup@v1
      with:
        k3s-install: false
        acorn-init: false
    - env:
        KUBECONFIG: '/path/to/your/kubeconfig.yaml'
      run: |
        acorn --version # acorn build, acorn run, etc
```

# License

Copyright (c) 2022 Acorn Labs, Inc.

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
