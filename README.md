# AWS Instance Dashboard

A dynamic Node.js web app that shows **real EC2 instance metadata** — 
Instance ID, AZ, IP, AMI, uptime, and request count.  
Each ALB-routed refresh may hit a **different instance**, letting you 
visually verify your ASG + ALB is distributing traffic correctly.

---

## Quick Start (Local)

```bash
npm install
npm start
# Open http://localhost:3000
```

---

## Deploy on AWS (ASG + ALB)

### Step 1 — Security Groups

| Resource | Inbound Rule |
|---|---|
| ALB SG | Port 80 from 0.0.0.0/0 |
| EC2 SG | Port 3000 from ALB SG only |

> Never expose port 3000 directly to the internet. ALB fronts it.

---

### Step 2 — ALB Target Group Settings

| Setting | Value |
|---|---|
| Protocol | HTTP |
| Port | **3000** |
| Health check path | `/health` |
| Health check interval | 30s |
| Healthy threshold | 2 |
| Unhealthy threshold | 3 |

---

### Step 3 — Launch Template

1. Choose Amazon Linux 2023 AMI
2. Attach your EC2 instance profile (needs `ec2:DescribeInstances` if you want tag lookup)
3. In **Advanced → User Data**, paste `userdata.sh`
4. Replace the `server.js` inline block with the actual content of `server.js`

> **Tip**: For cleaner deployments, upload `server.js` and `package.json`  
> to an S3 bucket and have `userdata.sh` pull from there with `aws s3 cp`.

---

### Step 4 — Auto Scaling Group

- Attach to your ALB Target Group
- Set min/desired/max (e.g., 2/2/5)
- Enable health checks: **ELB** (not just EC2)

---

### Step 5 — ALB Listener Rule

| Setting | Value |
|---|---|
| Protocol | HTTP (or HTTPS with ACM cert) |
| Port | 80 |
| Forward to | Your target group on port 3000 |

---

## App Endpoints

| Path | Description |
|---|---|
| `/` | Dashboard UI |
| `/api/info` | JSON: instance metadata |
| `/health` | ALB health check (returns 200) |

---

## Verifying ALB Load Balancing

1. Open the ALB DNS name in your browser
2. Hard refresh (Ctrl+Shift+R) several times
3. Watch the **Instance ID** and **Availability Zone** change
4. The **request counter** resets per instance — confirms separate instances

---

## Production Tips

- Add HTTPS via ACM certificate on the ALB listener
- Use a `t3.micro` or `t3.small` for this workload
- Add CloudWatch agent to ship logs
- Use AWS Secrets Manager or Parameter Store for any secrets
