# Twitchlint

Twitchlint is an extension for Visual Studio Code that allows your Twitch viewers sent you suggestions for your code via the chat.

## Features

This extension connects to the Twitch chat (or any IRC server) and allows your viewers to issue commands to display suggestions right in your editor.

![twitchlint](twitchlint.gif)

The syntax is as follows:

```:lint <filename> <line_number> <...suggestion>```

You can change the command in the settings, too.

## Requirements

If you want to use Twitch chat, you'll need an API token, e.g. from [here](http://www.twitchapps.com/tmi/).

## Extension Settings

See the *Contributions* tab.

## Known Issues

* Suggestions stay in place when adding/removing lines, instead of moving with the text.

## Release Notes

### 0.0.1

Initial release of Twitchlint