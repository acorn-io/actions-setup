// Based on https://github.com/debianmaster/actions-k3s

import * as core from '@actions/core'
import * as exec from '@actions/exec'
import wait from './wait'
import {mkdtemp} from 'node:fs/promises'
import path from 'path'
import os from 'os'

export async function install(version: string): Promise<string> {
  let res: exec.ExecOutput

  const dir = await mkdtemp(path.join(os.tmpdir(), `k3s-${version}-`))
  const kubeconfig = path.join(dir, 'kubeconfig.yaml')

  core.info(`Storing kubeconfig at: ${kubeconfig}`)

  res = await exec.getExecOutput('docker', [
    'run',
    '-d',
    '--privileged',
    `--name=k3s-${version}`,
    '--expose=6443',
    '-e',
    `K3S_KUBECONFIG_OUTPUT=${kubeconfig}`,
    '-e',
    'K3S_KUBECONFIG_MODE=666',
    '-v',
    `${dir}:${dir}`,
    '-p',
    '6443:6443',
    '-p',
    '80:80',
    '-p',
    '443:443',
    '-p',
    '8080:8080',
    `rancher/k3s:${version}`,
    'server'
  ])

  const containerName = res.stdout
  core.info(`Running in container: ${containerName}`)

  core.exportVariable('KUBECONFIG', kubeconfig)
  core.setOutput('kubeconfig', kubeconfig)

  let nodeName
  const count = 1
  const delay = 2
  const tries = 20
  while (!nodeName && count <= tries) {
    res = await exec.getExecOutput('kubectl get nodes --no-headers -oname')

    if (res.stdout) {
      nodeName = res.stdout
      break
    } else {
      core.info(`Unable to resolve node name, waiting ${delay} seconds and trying again. Attempt ${count} of ${tries}.`)
      await wait(delay * 1000)
    }
  }

  if (nodeName) {
    const command = `kubectl wait --for=condition=Ready ${nodeName}`
    await exec.exec(command)
  } else {
    core.setFailed('Failed to resolve node name.')
  }

  return containerName
}

export async function remove(containerName: string): Promise<void> {
  await exec.getExecOutput('docker', ['rm', '-f', containerName])
}
