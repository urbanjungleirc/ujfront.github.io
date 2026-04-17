# Fedora Terminal Cheat Sheet

## Navigation

- `pwd` shows the current folder
- `ls` lists files
- `ls -la` lists all files, including hidden ones
- `cd folder` enters a folder
- `cd ..` goes up one level
- `cd ~` goes to your home folder
- `clear` clears the terminal

## Files And Folders

- `mkdir test` creates a folder named `test`
- `touch file.txt` creates an empty file
- `cp a.txt b.txt` copies a file
- `mv old.txt new.txt` renames or moves a file
- `rm file.txt` deletes a file
- `rm -r folder` deletes a folder
- `cat file.txt` prints file contents
- `less file.txt` views a file page by page

## Search

- `find . -name "*.html"` finds files by name
- `rg "calendar"` searches text inside files
- `which node` shows where a command is installed
- `echo $PATH` shows where the shell looks for commands

## Ubuntu vs Fedora

- Ubuntu usually uses `apt`
- Fedora usually uses `dnf`

Examples:

- Ubuntu: `sudo apt install package`
- Fedora: `sudo dnf install package`

## Services

- `systemctl status NAME` checks a service
- `sudo systemctl restart NAME` restarts a service

## Permissions

- `ls -l` shows ownership and permissions
- `chmod +x script.sh` makes a script executable
- `sudo chown jiri:jiri file` changes file owner

## Bash Notes

`~/.bashrc` is not a command. If you type `/home/jiri/.bashrc`, bash tries to execute the file and you get `Permission denied`.

Use:

- `cat ~/.bashrc`
- `source ~/.bashrc`
- `. ~/.bashrc`

## Clasp Setup

Install `clasp` to your user directory:

```bash
npm install -g --prefix ~/.local @google/clasp
```

Add it to your `PATH`:

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
clasp --version
```

Log in and use it:

```bash
clasp login
clasp clone SCRIPT_ID
clasp pull
clasp push
```

## If `.bashrc` Ownership Is Wrong

If `~/.bashrc` is owned by `nobody`, fix it:

```bash
sudo chown jiri:jiri ~/.bashrc
```
