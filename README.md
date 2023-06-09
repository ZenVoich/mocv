# Motoko Compiler(moc) version manager

## Quick Start
One-time initialization
```
npx mocv init
```

Select `moc` version
```
npx mocv
```
![](mocv.png)

## Use in GitHub workflows
Simply add this step
```
- name: Select moc version
  run: npx mocv use 0.9.2
```

Instead of `0.9.2` you can specify any other moc version or `latest`

## Setup

### Install `mocv`
```
npm i mocv -g
```

### Set env var DFX_MOC_PATH
This command adds a line to `.bashrc` to set `DFX_MOC_PATH` to the current `moc` version
```
mocv init
```

Or you can add by yourself:

Run `mocv bin current`, copy result and add the line below to your `.bashrc`
```
export DFX_MOC_PATH=<result>/moc
```

## Usage
### Select moc version
You will be prompted to select one of the available `moc` versions
```
mocv
```
or
```
mocv use 0.8.4
```
or
```
mocv use latest
```

Done!

Now dfx will use current `moc` version when you build canisters with `dfx build` or `dfx deploy`

## Other use cases
If you want to use specific version of `moc` to deploy a canister:
```
DFX_MOC_PATH=$(mocv bin 0.8.3)/moc dfx deploy my_canister
```

## Reset
Revert changes made by `mocv init`
```
mocv reset
```