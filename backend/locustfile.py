import random
import uuid
from locust import HttpUser, task, between, events


class URLShortenerLoadTestUser(HttpUser):
    wait_time = between(0.1, 0.5)  # Simulate realistic user pacing

    def on_start(self):
        """Register and authenticate test user on start."""
        self.email = f"loadtest_{uuid.uuid4().hex[:8]}@example.com"
        self.password = "LoadTestPass123!"
        
        reg_response = self.client.post("/api/auth/register/", json={
            "email": self.email,
            "full_name": "Load Tester",
            "password": self.password,
            "password_confirm": self.password
        })

        if reg_response.status_code == 201:
            self.token = reg_response.json()["tokens"]["access"]
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            self.token = None
            self.headers = {}

        self.created_short_codes = []

        # Create a few initial short links
        for i in range(3):
            res = self.client.post(
                "/api/links/",
                json={"original_url": f"https://example.com/target/{uuid.uuid4()}"},
                headers=self.headers
            )
            if res.status_code == 201:
                self.created_short_codes.append(res.json()["short_code"])

    @task(70)
    def test_redirect_cached(self):
        """
        Scenario 1: High-throughput redirect simulation.
        Tests Redis cache-aside latency and Kafka event dispatch throughput.
        """
        if self.created_short_codes:
            code = random.choice(self.created_short_codes)
            # Redirect request (allow_redirects=False to measure direct 302 response latency)
            self.client.get(f"/{code}", allow_redirects=False, name="/{short_code} [Redirect]")

    @task(15)
    def test_create_link(self):
        """
        Scenario 2: URL Creation throughput and Base62 collision resolution.
        """
        res = self.client.post(
            "/api/links/",
            json={"original_url": f"https://example.com/page/{random.randint(1000, 999999)}"},
            headers=self.headers,
            name="/api/links/ [Create Link]"
        )
        if res.status_code == 201:
            code = res.json()["short_code"]
            if len(self.created_short_codes) < 50:
                self.created_short_codes.append(code)

    @task(10)
    def test_fetch_analytics(self):
        """
        Scenario 3: Analytics dashboard querying and aggregations.
        """
        res = self.client.get("/api/links/", headers=self.headers, name="/api/links/ [List Links]")
        if res.status_code == 200:
            links = res.json().get("results", [])
            if links:
                link_id = links[0]["id"]
                self.client.get(
                    f"/api/analytics/{link_id}/?range=7d",
                    headers=self.headers,
                    name="/api/analytics/{id}/ [Link Analytics]"
                )

    @task(5)
    def test_custom_alias_collision(self):
        """
        Scenario 4: Intentional alias collision concurrency test.
        """
        self.client.post(
            "/api/links/",
            json={"original_url": "https://example.com", "custom_alias": "contested-alias"},
            headers=self.headers,
            name="/api/links/ [Alias Collision Test]"
        )
