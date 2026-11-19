"""Publish only versioned Auth templates/OTP policy; preserve SMTP and redirects."""

import argparse
import json
import os
import re
import sys
import tomllib
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen


def build_payload(root):
    root = Path(root).resolve()
    config = tomllib.loads((root / "supabase/config.toml").read_text())
    email = config["auth"]["email"]
    payload = {
        "mailer_otp_length": email["otp_length"],
        "mailer_otp_exp": email["otp_expiry"],
        "mailer_autoconfirm": not email["enable_confirmations"],
        "mailer_secure_email_change_enabled": email["double_confirm_changes"],
    }
    for kind in ["confirmation", "recovery", "email_change"]:
        template = email["template"][kind]
        path = (root / template["content_path"]).resolve()
        if not path.is_relative_to(root / "supabase/templates"):
            raise ValueError("O template deve estar em supabase/templates.")
        content = path.read_text()
        if not content.strip() or not template["subject"].strip():
            raise ValueError("Template e assunto não podem estar vazios.")
        payload[f"mailer_subjects_{kind}"] = template["subject"]
        payload[f"mailer_templates_{kind}_content"] = content
    return payload


def synchronize(root, project, expected_site_url, request):
    if not re.fullmatch(r"[a-z]{20}", project):
        raise ValueError("Referência do projeto inválida.")
    if not expected_site_url.startswith("https://"):
        raise ValueError("A URL esperada deve usar HTTPS.")
    payload = build_payload(root)
    current = request("GET", project)
    if current.get("site_url", "").rstrip("/") != expected_site_url.rstrip("/"):
        raise ValueError("O projeto não corresponde à URL esperada; nenhuma configuração foi alterada.")
    changes = {key: value for key, value in payload.items() if current.get(key) != value}
    if not changes:
        return 0
    request("PATCH", project, changes)
    verified = request("GET", project)
    if any(verified.get(key) != value for key, value in payload.items()):
        raise RuntimeError("O provedor não confirmou a configuração de autenticação.")
    return len(changes)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--project-ref", required=True)
    parser.add_argument("--expected-site-url", required=True)
    args = parser.parse_args()
    token = os.environ.get("SUPABASE_ACCESS_TOKEN", "")
    if not token:
        raise ValueError("Configure SUPABASE_ACCESS_TOKEN.")

    def request(method, project, payload=None):
        req = Request(
            f"https://api.supabase.com/v1/projects/{project}/config/auth",
            method=method,
            headers={"Authorization": "Bearer " + token, "Content-Type": "application/json"},
            data=json.dumps(payload).encode() if payload is not None else None,
        )
        with urlopen(req, timeout=30) as response:
            return json.load(response)

    changed = synchronize(Path(__file__).resolve().parent.parent, args.project_ref, args.expected_site_url, request)
    print(f"Autenticação conferida: {changed} configurações atualizadas; SMTP e URLs preservados.")


if __name__ == "__main__":
    try:
        main()
    except HTTPError as error:
        sys.exit(f"A API de configuração do Supabase recusou a operação (HTTP {error.code}).")
    except (ValueError, RuntimeError) as error:
        sys.exit(str(error))
    except Exception:
        sys.exit("Não foi possível sincronizar a autenticação do Supabase. Confira a conexão e as credenciais.")
