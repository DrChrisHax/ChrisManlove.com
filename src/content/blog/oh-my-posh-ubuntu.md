---
title: "Setting Up oh-my-posh on Ubuntu Linux"
author: "Chris Manlove"
createdAt: 2026-06-23
---

## Introduction

While working at JudicateWest, one of my coworkers introduced me to oh-my-posh. Basically it is a program that formats the command line to look nicer as well as display useful information. This blog post is a simple guide to setting up oh-my-posh for Ubuntu Linux and using my custom theme.

## Set up

1.  First thing first, you want to open a terminal and run the command

```
curl -s https://ohmyposh.dev/install.sh | bash -s -- -d ~/.local/bin
```

This will run the oh-my-posh installation script and install the program to ~/.local/bin. Typically ~/.local/bin is the default location and the -d flag specifies the installation location so you can drop -d and everything after it if you wish.

2.  Next you will need to add the oh-my-posh binary to the path so that you can run the program as a command. This can be done with

```
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc && source ~/.bashrc
```

This will add the line `export PATH="$HOME/.local/bin:$PATH"` to the `.bashrc` file, which is the file bash reads on startup. `source ~/.bashrc` causes bash to re-read this file.

After all this you can run `oh-my-posh --version` to make sure that oh-my-posh was added to the path correctly.

3.  Next up, you will need a nerd font for oh-my-posh to display some of its symbols properly. I personally use **Hack Nerd Font Mono** but you can choose any font you want.

**_WORK IN PROGRESS_**

## My Config

After dialing in my config, here's what the final prompt looks like:

![oh-my-posh theme config](./images/oh-my-posh-ubuntu/oh-my-posh-theme.png)

> To generate this image yourself, run:
>
> ```bash
> oh-my-posh config export image --output oh-my-posh-theme.png
> ```

## Configuration Breakdown

## Tips
