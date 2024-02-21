cd "$(dirname "$0")" || exit 1;
if ! test ~/.ssh; then
  ln -s ~/.ssh ../.ssh
fi

type -p curl >/dev/null || (sudo apt update && sudo apt install curl -y)

for pkg in docker.io docker-doc docker-compose podman-docker containerd runc; do sudo apt-get remove $pkg; done

#### Spotify
curl -sS https://download.spotify.com/debian/pubkey_7A3A762FAFD4A51F.gpg | sudo gpg --dearmor --yes -o /etc/apt/trusted.gpg.d/spotify.gpg
echo "deb http://repository.spotify.com stable non-free" | sudo tee /etc/apt/sources.list.d/spotify.list

#### Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/debian/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian buster stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

#### Github CLI
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
sudo chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null

#### Apt-fast
curl -sL https://raw.githubusercontent.com/ilikenwf/apt-fast/master/quick-install.sh | bash

#### Apt commands
sudo apt-get update
sudo apt-fast upgrade -y
sudo apt-fast dist-upgrade -y

sudo apt-fast install jq spotify-client gh docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin -y
sudo apt autoremove -y

get_filename_from_url() {
    local url=$1
    local filename
    filename="${url##*/}"
    filename="${filename%%\?*}"
    echo "$filename"
}

setup_jetbrains() {
  DOWNLOAD_JSON=$(curl -sL "https://data.services.jetbrains.com/products/releases?code=TBA&latest=true&type=release" | jq ".TBA[0].downloads.linux" --raw-output -cM)
  DOWNLOAD_URL=$(echo "$DOWNLOAD_JSON" | jq --raw-output .link)
  CHECKSUM_URL=$(echo "$DOWNLOAD_JSON" | jq --raw-output .checksumLink)
  FILENAME=$(get_filename_from_url "$DOWNLOAD_URL")
  BASENAME="${FILENAME%.tar.gz}"

  curl "$DOWNLOAD_URL" -Lo "$(get_filename_from_url "$DOWNLOAD_URL")"
  curl -sL "$CHECKSUM_URL" | sha256sum -c
  tar -xvf "$FILENAME"
  ./$BASENAME/jetbrains-toolbox
}

setup_minikube() {
  curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
  sudo install minikube-linux-amd64 /usr/local/bin/minikube
}

setup_kubectl() {
  # shellcheck disable=SC2155
  local stable=$(curl -sL https://dl.k8s.io/release/stable.txt)
  curl -LO "https://dl.k8s.io/release/$stable/bin/linux/amd64/kubectl"
  curl -sL "https://dl.k8s.io/$stable/bin/linux/amd64/kubectl.sha256" | sha256sum -c
  sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
  rm -rf kubectl
}

setup_helm() {
  curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3
  chmod 700 get_helm.sh
  ./get_helm.sh
}

setup_postman() {
  curl https://dl.pstmn.io/download/latest/linux_64 -Lo postman.tar.gz
  tar -xf postman.tar.gz -C ~/Documents
  mkdir -p ~/.config/xfce4/panel/launcher-24
  rm -f ~/.config/xfce4/panel/launcher-24/16908562591.desktop
  touch ~/.config/xfce4/panel/launcher-24/16908562591.desktop

  cat >> ~/.config/xfce4/panel/launcher-24/16908562591.desktop << EOF
[Desktop Entry]
Name=Postman
Comment=Test your apis
GenericName=Http Browser
X-GNOME-FullName=Postman
Exec=~/Documents/Postman/Postman %u
Terminal=false
X-MultipleArgs=false
Type=Application
Icon=~/Documents/Postman/app/icons/icon_128x128.png
Categories=Network;
MimeType=x-scheme-handler/http;x-scheme-handler/https;
StartupWMClass=
StartupNotify=true
X-XFCE-Source=
EOF
}

setup_nvm() {
  curl -sL "https://raw.githubusercontent.com/nvm-sh/nvm/$(curl -sL "https://api.github.com/repos/nvm-sh/nvm/tags" | jq --raw-output ".[0].name")/install.sh" | bash
  nvm install 20
  nvm use default 20
  corepack enable

  echo Node: "$(node -v)"
  echo NPM : "$(npm -v)"
  echo Yarn: "$(yarn -v)"
  echo PnPm: "$(pnpm -v)"
}

setup_docker() {
  sudo groupadd docker
  sudo usermod -aG docker "$USER"
  newgrp docker

  sudo systemctl enable docker.service
  sudo systemctl enable containerd.service

  docker run hello-world
}

cd /tmp > /dev/null || exit 0

setup_jetbrains
setup_minikube
setup_kubectl
setup_helm
setup_postman
setup_nvm
setup_docker

cd -    > /dev/null || exit 0

notify-send "Restarting in 10 seconds"
sleep 10
nohup shutdown -r now > /dev/null 2>&1 &
