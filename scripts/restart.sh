rm -rf test-ledger

solana-test-validator \
-u "https://api.mainnet-beta.solana.com" \
-c metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s \
-c p1exdMJcjVao65QdewkaZRUnU6VPSXhus9n2GzWfh98 \
-c PwDiXFxQsGra4sFFTT8r1QWRMd4vfumiWC1jfWNfdYT \
--bpf-program AqzBa4Xaiorxbu49AV6Ja9RsspZXSCWcJCZp3imeLLhg /Users/harshasomisetty/code/paperhand/target/deploy/exhibition.so \
--bpf-program 3H8A6ZMT9XfTDjCsm1nsCwA37PtSPERDmsh5npmjBtak /Users/harshasomisetty/code/paperhand/target/deploy/shop.so \
--bpf-program 8b7yjj2P5fHV9NCyNXJut1pDM1J1D9oRKzqUGW1ycTWk /Users/harshasomisetty/code/paperhand/target/deploy/checkout.so \
--bpf-program 4mSuHN8AW1z7Y4NFpS4jDc6DvNxur6qH8mbPMz5oHLiS /Users/harshasomisetty/code/paperhand/target/deploy/carnival.so
