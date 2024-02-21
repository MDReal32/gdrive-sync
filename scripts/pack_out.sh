PORT=4004
FILE_NAME="/tmp/mdreal.tar.gz"

CLIENT_ID=$(jq -r '.web.client_id' ~/mdreal/gdrive.json)
CLIENT_SECRET=$(jq -r '.web.client_secret' ~/mdreal/gdrive.json)
SCOPE="https://www.googleapis.com/auth/drive"
REDIRECT_URI="http://localhost:4004"
PARENT_FOLDER_ID="1GaCSzMBYfV0hbb6ltCgYhW4jzU3ZD2nP"

AUTH_URL="https://accounts.google.com/o/oauth2/auth?response_type=code&client_id=$CLIENT_ID&scope=$SCOPE&redirect_uri=$REDIRECT_URI"

handle_server() {
  local FIFO_FILE="request.fifo"
  rm -f $FIFO_FILE
  mkfifo $FIFO_FILE

  while true; do
    [ ! -e "$FIFO_FILE" ] && break;

    cat "$FIFO_FILE" | nc -l -p "$PORT" | (
      read -r request

      path_with_query="${request#GET }"
      path_with_query="${path_with_query% HTTP/*}"
      qs="${path_with_query#*\?}"

      echo "$qs"

      echo -e "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n<html><body>Done!<script>setTimeout(window.close, 5e3)</script></body></html>\r\n\r\n" > $FIFO_FILE
      rm -f $FIFO_FILE
    )
  done
}

tar -czf $FILE_NAME ~/mdreal
xdg-open "$AUTH_URL"

QS=$(handle_server)
CODE=$(echo "$QS" | grep -o -E "code=[^&]+" | cut -d= -f2)
RESPONSE=$(curl -s -X POST "https://oauth2.googleapis.com/token" -d "client_id=$CLIENT_ID&client_secret=$CLIENT_SECRET&code=$CODE&grant_type=authorization_code&redirect_uri=$REDIRECT_URI")
ACCESS_TOKEN=$(echo "$RESPONSE" | jq .response)

echo "Uploading directory"
curl -X POST \
  -L "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -F "metadata={ name: 'mdreal.tar.gz', parents: ['$PARENT_FOLDER_ID'] };type=application/json;charset=UTF-8" \
  -F "file=@$FILE_NAME" > /dev/null
