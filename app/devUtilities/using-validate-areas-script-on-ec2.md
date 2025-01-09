
# 🚀 EC2 Instance Setup Guide with Node.js and DocumentDB Connectivity for the `Validate-Areas` Utility Script

This guide walks you through launching an **AWS EC2 instance** in the **same subnet and VPC as your DocumentDB cluster** to run your **Validate-Areas** script. 

The setup includes connecting to your EC2 instance securely via **Session Manager**, installing **system build tools**, and configuring connectivity to **DocumentDB**.

---

## 📚 Why Run I/O-Intensive Operations Close to Your Database?

Running **I/O-intensive operations** close to where your **database resides** is a **best practice** for cloud-based applications. Here's a breakdown of the key benefits in terms of **cost**, **performance**, **reliability**, and **security**.

---

### 💰 Cost Efficiency

When your application and database are in the **same VPC and subnet**, you reduce **data transfer costs** associated with **cross-region communication**. AWS charges for **data transferred between availability zones or regions**, and running your compute instance close to your **DocumentDB cluster** minimizes these expenses. Additionally, it reduces the need for **expensive bandwidth upgrades** to handle **long-distance network traffic**. By optimizing your network design, you avoid unnecessary costs while keeping your architecture streamlined.

---

### ⚡ Performance

Running **compute resources** close to your **DocumentDB cluster** significantly improves **application performance**. When the application and database are in the **same subnet**, you reduce **network latency**, minimizing the time it takes for **read/write operations** to complete. This is particularly important for **I/O-heavy tasks** like:

- **Data processing pipelines**
- **Large bulk insertions**
- **Complex queries** that require frequent communication between the application and the database

The **shorter the network distance**, the **faster the response times**, resulting in a **better user experience** and more **efficient operations**.

---

### 🔄 Reliability

Keeping **I/O-intensive operations** within the **same VPC** and **availability zone** enhances **system reliability**. **Long-distance network connections** are more prone to **timeouts**, **packet loss**, and **network interruptions**, especially for **large-scale data transfers**. By placing your **EC2 instance** close to your **DocumentDB cluster**, you ensure more **stable connectivity** and **faster failover** in the event of a **service disruption**.

In AWS, **private network connections** are more resilient to **regional outages** and **network congestion**, making your system **more reliable** for **critical workloads**.

---

### 🔒 Security

Running **I/O-intensive operations** within the **same subnet** as your **DocumentDB cluster** also **enhances security**. By keeping **all traffic** within a **private VPC**, you limit exposure to the **public internet**, reducing the risk of **data breaches** and **unauthorized access**. It’s easier to enforce **strict access controls** and **network policies** when both the application and database are on the **same private network**.

Moreover, minimizing **external data transfers** helps ensure that **sensitive data** is not exposed to unnecessary risks. This setup is essential for **compliance** with industry standards like **GDPR** and **HIPAA**, which mandate secure data handling.

---

### 🎯 Summary

By running **I/O-intensive operations** close to your **database**, you achieve:

| Benefit       | Description                                      |
|---------------|--------------------------------------------------|
| 💰 Cost       | Reduce cross-region data transfer fees           |
| ⚡ Performance | Improve response times and reduce latency        |
| 🔄 Reliability | Ensure stable, resilient connectivity            |
| 🔒 Security    | Enhance data protection and limit exposure risks |

Following this **best practice** not only optimizes your application’s **performance and costs**, but also **improves reliability** and **strengthens security**—critical for **cloud-based workloads** that handle **large volumes of data**.

---

## ✅ Step 1: Identify Your DocumentDB's VPC and Subnet

1. Go to **AWS Console** > **DocumentDB** > **Clusters**.
2. Click your **DocumentDB cluster** and note the following:
   - **VPC ID**
   - **Subnet Group Name**
3. Go to **VPC** in the AWS Console and search for your **VPC ID**.
4. In **Subnets**, find the **subnet IDs** associated with your **Subnet Group Name**.

---

## ✅ Step 2: Create an IAM Role for Session Manager

1. Go to **IAM** > **Roles**.
2. Click **Create Role**.
3. Select **AWS Service** and choose **EC2**.
4. Attach the **AmazonSSMManagedInstanceCore** policy.
5. Name your role (e.g., `EC2SessionManagerRole`) and create it.

---

## ✅ Step 3: Launch an EC2 Instance in the Same Subnet as DocumentDB

1. Go to **EC2 Dashboard** > **Instances** > **Launch Instances**.
2. Choose an **Amazon 2023 AMI** (or Ubuntu if you prefer).
3. Select an **instance type** (e.g., `t3.small`).
4. In **Network Settings**:
   - Choose the **VPC** associated with your DocumentDB cluster.
   - Select one of the **subnet IDs** you noted earlier.
   - **Disable Auto-assign public IP** to ensure your instance doesn’t have a public IP.
5. Under **Advanced Details**:
   - Expand **IAM Instance Profile** and choose the **IAM role** you created for **Session Manager**.
6. Click **Launch Instance**.

---

## ✅ Step 4: Connect to Your EC2 Instance Using Session Manager

1. Go to **Systems Manager** > **Session Manager** in the AWS Console.
2. Click **Start Session**.
3. Select your **EC2 instance** and click **Start Session**.

🎉 You now have a secure **shell session** directly in the AWS Console without needing a public IP or SSH access.

---

## ✅ Step 5: Install NVM (Node Version Manager) on Your EC2 Instance

Using **NVM** is the recommended way to manage **Node.js versions** on your EC2 instance. It allows you to switch between different versions of Node.js easily.

### **Install NVM**:

Run the following command in your **Session Manager shell**:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.4/install.sh | bash
```

### **Activate NVM**:

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
```

To make it **persistent** across sessions, add the activation commands to your **.bashrc**:

```bash
echo 'export NVM_DIR="$HOME/.nvm"' >> ~/.bashrc
echo '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' >> ~/.bashrc
```

---

## ✅ Step 6: Install System Build Tools on the EC2 Instance

### For Amazon Linux 2

```bash
sudo yum groupinstall "Development Tools" -y
sudo yum install -y gcc-c++ make
```

---

## ✅ Step 7: Clone Your GitHub Repository and Checkout Branch

```bash
git clone https://github.com/gfw-api/gfw-area.git
cd gfw-area
git branch -r // view the available branches
git checkout <branch>
```

---

### **Install the Proper Node.js Using NVM**:

After installing **NVM**, install the **version specified** in the repository:

```bash
nvm install
nvm use
```

Verify the installation:

```bash
node -v
npm -v
```

---


## ✅ Step 8: Install Dependencies

```bash
npx yarn install
```

---

## ✅ Step 9: Run the Batch Update Utility

### Verify All Areas (effectively a dry run as there are no writes)
```bash
NODE_PATH=./app/src node ./app/devUtilities/validate-areas.js --dryrun \
--database area \
--host <DocumentDB hostname> \
--port <DocumentDB port> \
--username <DocumentDB username> \
--password <DocuementDB password> \
--batch-size 100 \
--logfile verification_results.log
```

### Save All Areas
```bash
NODE_PATH=./app/src node ./app/devUtilities/validate-areas.js \
--database area \
--host <DocumentDB hostname> \
--port <DocumentDB port> \
--username <DocumentDB username> \
--password <DocuementDB password> \
--batch-size 100 \
--logfile save_results.log
```

---

## 🎯 Summary

By following this guide, you will have a **secure and efficient environment** for running your **Validate-Areas** on **AWS EC2** with **DocumentDB connectivity**.
