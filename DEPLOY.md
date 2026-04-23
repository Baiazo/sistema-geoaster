# Deploy — Cloudflare Tunnel

Guia para expor o sistema GeoAster na internet sem abrir portas no firewall.

## Pré-requisitos

- Conta gratuita em [cloudflare.com](https://cloudflare.com)
- Domínio próprio configurado no Cloudflare
- Next.js rodando local na porta `3000`
- Acesso de administrador no servidor Windows

## 1. Instalar o Cloudflared

1. Baixe em: https://github.com/cloudflare/cloudflared/releases
2. Arquivo: `cloudflared-windows-amd64.exe`
3. Renomeie para `cloudflared.exe`
4. Mova para: `C:\Program Files\Cloudflared\`
5. Adicione essa pasta à variável de ambiente `Path` do Windows

## 2. Autenticar

```cmd
cloudflared tunnel login
```

- Faça login no navegador que abrir
- Selecione seu domínio

## 3. Criar o túnel

```cmd
cloudflared tunnel create geoaster
```

Anote o **Tunnel ID** que aparecer.

## 4. Configurar (`config.yml`)

Crie a pasta:
```cmd
mkdir C:\ProgramData\cloudflared
```

Crie o arquivo `C:\ProgramData\cloudflared\config.yml`:

```yaml
tunnel: <SEU_TUNNEL_ID>
credentials-file: C:\Users\<USUARIO>\.cloudflared\<SEU_TUNNEL_ID>.json

ingress:
  - hostname: sistema.suaempresa.com.br
    service: http://localhost:3000
  - service: http_status:404
```

## 5. Criar o DNS

```cmd
cloudflared tunnel route dns geoaster sistema.suaempresa.com.br
```

## 6. Instalar como serviço Windows

```cmd
cloudflared service install
net start cloudflared
```

## 7. Testar

Acesse `https://sistema.suaempresa.com.br` com o Next.js rodando na porta 3000.

---

**Nota:** O JWT (login) já protege o dashboard. A página pública de protocolo (`/protocolo`) fica naturalmente acessível.
