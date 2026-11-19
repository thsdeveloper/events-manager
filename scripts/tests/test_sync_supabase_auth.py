import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
from sync_supabase_auth import build_payload, synchronize

PROJECT = "yqjkujwugetsffldkisd"
SITE = "https://flouvi-dev.vercel.app"


class AuthConfigurationTests(unittest.TestCase):
    def test_publishes_local_branded_templates_and_the_code_policy(self):
        payload = build_payload(ROOT)
        self.assertEqual(payload.get("mailer_otp_length"), 6)
        self.assertEqual(payload.get("mailer_otp_exp"), 900)
        self.assertIs(payload.get("mailer_autoconfirm"), False)
        self.assertIn("{{ .Token }}", payload.get("mailer_templates_confirmation_content", ""))
        self.assertIn("#token_hash={{ .TokenHash }}", payload.get("mailer_templates_recovery_content", ""))
        for kind in ["confirmation", "recovery", "email_change"]:
            self.assertIn('lang="pt-BR"', payload.get(f"mailer_templates_{kind}_content", ""))
            self.assertIn("/api/branding/logo", payload.get(f"mailer_templates_{kind}_content", ""))
            self.assertTrue(payload.get(f"mailer_subjects_{kind}"))
        self.assertFalse(any(k.startswith("smtp_") for k in payload))
        self.assertNotIn("site_url", payload)
        self.assertNotIn("uri_allow_list", payload)

    def test_updates_and_verifies_only_managed_fields(self):
        remote = {"site_url": SITE, "smtp_pass": "preserve-private-setting", "uri_allow_list": "preserve-redirects"}
        def request(method, project, payload=None):
            self.assertEqual(project, PROJECT)
            if method == "PATCH":
                remote.update(payload)
            return remote.copy()
        synchronize(ROOT, PROJECT, SITE, request)
        self.assertEqual(remote.get("mailer_otp_length"), 6)
        self.assertIn("{{ .TokenHash }}", remote.get("mailer_templates_recovery_content", ""))
        self.assertEqual(remote["smtp_pass"], "preserve-private-setting")
        self.assertEqual(remote["uri_allow_list"], "preserve-redirects")

    def test_does_not_write_when_configuration_is_current(self):
        remote = {**build_payload(ROOT), "site_url": SITE}
        def request(method, project, payload=None):
            self.assertNotEqual(method, "PATCH")
            return remote
        synchronize(ROOT, PROJECT, SITE, request)

    def test_refuses_a_project_with_a_different_site_url(self):
        def request(method, project, payload=None):
            self.assertNotEqual(method, "PATCH")
            return {"site_url": "https://another-project.example"}
        with self.assertRaises(ValueError):
            synchronize(ROOT, PROJECT, SITE, request)

    def test_fails_when_the_provider_does_not_persist_the_settings(self):
        def request(method, project, payload=None):
            return {"site_url": SITE}
        with self.assertRaises(RuntimeError):
            synchronize(ROOT, PROJECT, SITE, request)


if __name__ == "__main__":
    unittest.main()
