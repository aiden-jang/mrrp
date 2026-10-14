# Security

Please report vulnerabilities privately to [me@aidenjang.com](mailto:me@aidenjang.com).
Include the affected behavior, browser or API route, a minimal reproduction using a disposable
room, and the impact you observed. Do not post personal room links, seat credentials, recovery
codes or someone else's room content in a public issue.

The Worker enforces seat permissions. Account linking is optional and uses the separate shared
accounts service. Provider keys and deployment tokens must remain server-side.

Dependency auditing includes development tooling as well as production packages. Deployment
runs only after CI passes on `main`. These checks reduce risk; they are not a security warranty.
