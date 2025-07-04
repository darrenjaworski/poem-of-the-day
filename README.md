# Poem of the Day

An extension to provide you with a daily dose of poetry while you're coding.

---

[![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/darrenjaworski.poem-of-the-day?color=blue&logo=visual-studio)](https://marketplace.visualstudio.com/items?itemName=darrenjaworski.poem-of-the-day&WT.mc_id=darrenjaworski)
[![Visual Studio Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/darrenjaworski.poem-of-the-day?logo=visualstudio)](https://marketplace.visualstudio.com/items?itemName=darrenjaworski.poem-of-the-day&WT.mc_id=darrenjaworski)
[![Visual Studio Marketplace Downloads](https://img.shields.io/visual-studio-marketplace/d/darrenjaworski.poem-of-the-day?logo=visualstudio)](https://marketplace.visualstudio.com/items?itemName=darrenjaworski.poem-of-the-day&WT.mc_id=darrenjaworski)

## Installation

Install this extension from the [VS Code marketplace](https://marketplace.visualstudio.com/items?itemName=DarrenJaworski.poem-of-the-day).

OR

With VS Code open, search for `poem-of-the-day` in the extension panel (`Ctrl+Shift+X` on Windows/Linux or `Cmd(⌘)+Shift+X` on MacOS) and click install.

OR

With VS Code open, launch VS Code Quick Open (`Ctrl+P` on Windows/Linux or `Cmd(⌘)+P` on MacOS), paste the following command, and press enter.

`ext install darrenjaworski.poem-of-the-day`

## Features

A daily poem is just a click away in the lower left of your toolbar. Happy coding.

![Poem of the Day Preview](https://raw.githubusercontent.com/darrenjaworski/poem-of-the-day/refs/heads/main/poem-of-the-day-preview.png)

## Requirements

This extension has no dependencies.

## Extension Settings

This extension contributes the following settings:

- `poemOfTheDay.openOnStartup`: On VS Code startup, the poem of the day will be displayed. (defaults to false)

## Commands

- **Show Poem of the Day** (`poem-of-the-day.showPoemOfTheDay`): Opens the Poem of the Day in a webview panel.

## Known Issues

[Please report any bugs or issues on the extension's Github repo.](https://github.com/darrenjaworski/poem-of-the-day/issues/new)

## Release Notes

### 1.0.7

- fix: typo on footer

### 1.0.6

- chore: update readme

### 1.0.5

- fix: random author each day

### 1.0.4

- fix: remove caching

### 1.0.3

- fix fetch new poem every day

### 1.0.2

- fix: crop icon

### 1.0.1

- chore: updated icon
- chore: updated readme

### 1.0.0

- feat: a random poem fetched daily and cached locally from poetrydb.org
- feat: poetry displayed in webview
- feat: toolbar icon to show poem and shows title and author preview
- feat: command to show poem of the day
- feat: setting to automatically show poem of the day on startup (defaults to false)
