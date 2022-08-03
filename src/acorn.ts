import * as core from '@actions/core'
import * as exec from '@actions/exec'
import * as tc from '@actions/tool-cache'
import os from 'os'

interface Asset {
  version: string
  platform: string
  arch: string
  url: string
}

export async function getChannels(): Promise<Record<string, string>> {
  const data = await fetch('https://update.acrn.io/v1-releases/channels')

  console.info(data)

  const out = {}

  return out
}

export async function resolveVersion(input: string): Promise<string> {
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
  let extension = 'tar.gz'
  let arch = os.arch()

  if (platform === 'darwin') {
    platform = 'macos'
    arch = 'universal'
  } else if (platform === 'windows') {
    extension = 'zip'
  }

  if (arch === 'x64') {
    arch = 'amd64'
  }

  const url = `https://github.com/acorn-io/acorn/releases/download/${version}/acorn-${version}-${platform}-${arch}.${extension}`

  return Promise.resolve({
    version,
    platform,
    arch,
    url
  } as Asset)
}

export async function installAsset(asset: Asset): Promise<void> {
  const downloaded = await tc.downloadTool(asset.url)
  const dir = await tc.extractTar(downloaded, '')

  const cachedPath = await tc.cacheDir(dir, 'acorn', asset.version)
  core.addPath(cachedPath)
  core.setOutput('acorn-version', asset.version)
}

export async function init(): Promise<void> {
  await exec.getExecOutput('acorn init')
}
