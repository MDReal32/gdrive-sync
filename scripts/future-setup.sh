#curl -sS https://download.spotify.com/debian/pubkey_7A3A762FAFD4A51F.gpg | sudo gpg --dearmor --yes -o /etc/apt/trusted.gpg.d/spotify.gpg
#echo "deb http://repository.spotify.com stable non-free" | sudo tee /etc/apt/sources.list.d/spotify.list
#
#curl -sL https://raw.githubusercontent.com/ilikenwf/apt-fast/master/quick-install.sh | bash
#
#sudo apt-get update
#sudo apt-fast upgrade -y
#sudo apt-fast dist-upgrade -y
#
#sudo apt-fast install jq spotify-client -y
#sudo apt autoremove -y

get_filename_from_url() {
    local url=$1
    local filename
    filename="${url##*/}"
    filename="${filename%%\?*}"
    echo "$filename"
}

URLS_TXT="/tmp/urls.txt"
RUNTIME_SCRIPT="/tmp/runtime.sh"

rm -rf $URLS_TXT
touch $URLS_TXT

rm -rf $RUNTIME_SCRIPT
touch $RUNTIME_SCRIPT
chmod u+x $RUNTIME_SCRIPT

save_to_urls() {
  local url=$1
  local file=$2

  echo "Downloading: "
  echo " - url - ${url:?}"
  echo " - to  - ${file:?}"

  echo "url = \"$url\"" >> $URLS_TXT
  echo "output = \"$file\"" >> $URLS_TXT
}

prepare_jetbrains() {
  DOWNLOAD_JSON=$(curl -s "https://data.services.jetbrains.com/products/releases?code=TBA&latest=true&type=release" | jq ".TBA[0].downloads.linux" --raw-output -cM)
  DOWNLOAD_URL=$(echo "$DOWNLOAD_JSON" | jq --raw-output .link)
  CHECKSUM_URL=$(echo "$DOWNLOAD_JSON" | jq --raw-output .checksumLink)
  FILENAME=$(get_filename_from_url "$DOWNLOAD_URL")
  BASENAME="${FILENAME%.tar.gz}"

  save_to_urls "$DOWNLOAD_URL" "$FILENAME"
  cat >> $RUNTIME_SCRIPT << EOF
#### Jetbrains
curl -s $CHECKSUM_URL | sha256sum -c
tar -xvf $FILENAME
./$BASENAME/jetbrains-toolbox

EOF
}

prepare_minikube() {
  save_to_urls "https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64" "minikube"
  cat >> $RUNTIME_SCRIPT <<EOF
#### Minikube
sudo install minikube-linux-amd64 /usr/local/bin/minikube

EOF
}

prepare_kubectl() {
  local stable=$(curl -sL https://dl.k8s.io/release/stable.txt)
  save_to_urls "https://dl.k8s.io/release/$stable/bin/linux/amd64/kubectl" "kubectl"
  cat >> $RUNTIME_SCRIPT << EOF
#### Kubectl
curl -s https://dl.k8s.io/$stable/bin/linux/amd64/kubectl.sha256 | sha256sum -c
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

EOF
}

prepare_helm() {
  save_to_urls "https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3" "get_helm.sh"
  cat >> $RUNTIME_SCRIPT << EOF
#### Helm
chmod 700 get_helm.sh
./get_helm.sh

EOF
}

prepare_postman() {
  save_to_urls "https://dl.pstmn.io/download/latest/linux_64" "postman.tar.gz"
  cat >> $RUNTIME_SCRIPT << EOF
#### Postman
tar -xf postman.tar.gz -C ~/Documents
mkdir -p ~/.config/xfce4/panel/launcher-postman
touch ~/.config/xfce4/panel/launcher-postman/postman.desktop

#### Postman Desktop Entry
echo "[Desktop Entry]" >> ~/.config/xfce4/panel/launcher-postman/postman.desktop
echo "Name=Postman" >> ~/.config/xfce4/panel/launcher-postman/postman.desktop
echo "Comment=Test your APIs" >> ~/.config/xfce4/panel/launcher-postman/postman.desktop
echo "GenericName=HTTP Browser" >> ~/.config/xfce4/panel/launcher-postman/postman.desktop
echo "X-GNOME-FullName=Postman" >> ~/.config/xfce4/panel/launcher-postman/postman.desktop
echo "Exec=~/Documents/Postman/Postman %u" >> ~/.config/xfce4/panel/launcher-postman/postman.desktop
echo "Terminal=false" >> ~/.config/xfce4/panel/launcher-postman/postman.desktop
echo "X-MultipleArgs=false" >> ~/.config/xfce4/panel/launcher-postman/postman.desktop
echo "Type=Application" >> ~/.config/xfce4/panel/launcher-postman/postman.desktop
echo "Icon=~/Documents/Postman/app/icons/icon_128x128.png" >> ~/.config/xfce4/panel/launcher-postman/postman.desktop
echo "Categories=Network;" >> ~/.config/xfce4/panel/launcher-postman/postman.desktop
echo "MimeType=x-scheme-handler/http;x-scheme-handler/https;" >> ~/.config/xfce4/panel/launcher-postman/postman.desktop
echo "StartupWMClass=" >> ~/.config/xfce4/panel/launcher-postman/postman.desktop
echo "StartupNotify=true" >> ~/.config/xfce4/panel/launcher-postman/postman.desktop
echo "X-XFCE-Source=" >> ~/.config/xfce4/panel/launcher-postman/postman.desktop
echo "" >> ~/.config/xfce4/panel/launcher-postman/postman.desktop

EOF
}

prepare_jetbrains
prepare_minikube
prepare_kubectl
prepare_helm
prepare_postman

echo "\n\n"

cd /tmp > /dev/null || exit 0

curl --progress-bar --config urls.txt > /dev/null
./runtime.sh

cd -    > /dev/null || exit 0
