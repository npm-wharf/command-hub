# Make keys for hub server
mkdir -p ./certs/hub
openssl genrsa -out ./certs/hub/privkey.pem 4096
openssl rsa -in ./certs/hub/privkey.pem -pubout -out ./certs/hub/pubkey.pem

# Make keys for hub server
mkdir -p ./certs/hikaru
openssl genrsa -out ./certs/hikaru/privkey.pem 4096
openssl rsa -in ./certs/hikaru/privkey.pem -pubout -out ./certs/hikaru/pubkey.pem

# Make keys for client
mkdir -p ./certs/client
openssl genrsa -out ./certs/client/privkey.pem 4096
openssl rsa -in ./certs/client/privkey.pem -pubout -out ./certs/client/pubkey.pem