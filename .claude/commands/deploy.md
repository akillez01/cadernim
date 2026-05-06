# Deploy Cadernim para Produção

Faz o build do projeto e envia para o servidor de produção (66.179.92.233).

## Fluxo

1. Executa `npm run build:plesk` para gerar o bundle em `dist/plesk/`
2. Sincroniza via rsync para `/var/www/vhosts/cadernim.com.br/httpdocs/`
3. Reinicia o app via `touch tmp/restart.txt` (Passenger)

## Instruções

Execute o script de deploy:

```bash
bash scripts/deploy.sh
```

Monitore a saída. Se houver erro de build, corrija antes de tentar novamente.
Após o deploy, verifique se o site está respondendo em https://cadernim.com.br.

Se o usuário pedir para "fazer deploy", "subir para produção", "atualizar o servidor" ou "enviar para o servidor", execute esse comando automaticamente.
