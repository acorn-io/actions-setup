// Based on https://github.com/debianmaster/actions-k3s

import * as core from '@actions/core'
import * as exec from '@actions/exec'
import retry from './retry'
import {mkdtemp, access} from 'node:fs/promises'
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

  const ok = await retry<boolean>(async () => {
    try {
      await access(kubeconfig)
      return true
    } catch (e) {
      return false
    }
  }, 'Waiting for kubeconfig')

  if (ok !== true) {
    throw new Error('Gave up waiting for kubeconfig')
  }

  const nodeName = await retry<string>(async () => {
    res = await exec.getExecOutput('kubectl get nodes --no-headers -oname')

    if (res.stdout) {
      return res.stdout
    }

    return ''
  })

  if (nodeName) {
    const command = `kubectl wait --for=condition=Ready ${nodeName}`
    await exec.exec(command)
  } else {
    throw new Error('Failed to resolve node name.')
  }

  return containerName
}

export async function remove(containerName: string): Promise<void> {
  await exec.getExecOutput('docker', ['rm', '-f', containerName])
}
