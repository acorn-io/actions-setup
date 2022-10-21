import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as tc from '@actions/tool-cache'
import fetch from 'node-fetch'
import os from 'os'
import {mkdtempSync, chmodSync} from 'fs'

interface Asset {
  version: string
  platform: string
  arch: string
  url: string
  extension: string
}

export async function getChannels(): Promise<Record<string, string>> {
  const res = await fetch('https://update.acrn.io/v1-release/channels', {headers: {accept: 'application/json'}})
  const body = (await res.json()) as any

  const out: Record<string, string> = {}

  for (const entry of body.data) {
    out[entry.id as string] = entry.latest
  }

  console.info('Channels: ', out)

  return out
}

export async function resolveVersion(input: string): Promise<string> {
  if (input === 'main') {
    return input
  }

  if (input.match(/^\d+/)) {
    return `v${input}`
  } else if (input.match(/^v\d+/)) {
    return input
  }

  const channels = await getChannels()

  if (channels[input]) {
    return channels[input]
  }

  // There is no latest yet...
  if (input === 'latest' && channels['testing']) {
    return channels['testing']
  }

  throw new Error(`No release found for ${input}`)
}

export async function resolveAsset(version: string): Promise<Asset> {
  let platform = `${os.platform()}`
  let arch = os.arch()
  let extension = ''
  let url = ''

  if (arch === 'x64') {
    arch = 'amd64'
  }

  if (version === 'main') {
    if (platform === 'windows') {
      extension = 'exe'
    }

    url = `https://cdn.acrn.io/cli/default_${platform}_${arch}${arch === 'amd64' ? '_v1' : ''}/acorn`
  } else {
    switch (platform) {
      case 'windows':
        extension = 'zip'
        break
      case 'darwin':
        platform = 'macos'
        arch = 'universal'
        extension = 'tar.gz'
        break
      case 'linux':
        extension = 'tar.gz'
    }

    url = `https://github.com/acorn-io/acorn/releases/download/${version}/acorn-${version}-${platform}-${arch}`
  }

  if (extension) {
    url = `${url}.${extension}`
  }

  return Promise.resolve({
    version,
    platform,
    arch,
    extension,
    url
  } as Asset)
}

export async function installAsset(asset: Asset): Promise<void> {
  let dir = ''

  if (asset.extension && asset.extension !== 'exe') {
    const downloaded = await tc.downloadTool(asset.url)
    dir = await tc.extractTar(downloaded, '')
  } else {
    dir = mkdtempSync('acorn-')
    const file = `${dir}/acorn${asset.extension === '.exe' ? '.exe' : ''}`
    await tc.downloadTool(asset.url, file)
    chmodSync(file, '775')
  }

  const cachedPath = await tc.cacheDir(dir, 'acorn', asset.version)
  core.addPath(cachedPath)
  core.setOutput('acorn-version', asset.version)
}

export async function init(): Promise<void> {
  await exec.getExecOutput('acorn init')
}
