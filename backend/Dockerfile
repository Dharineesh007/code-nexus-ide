# Use a lightweight Ubuntu Linux OS as our sandbox environment
FROM ubuntu:22.04

# Stop the installer from asking "Yes/No" questions so it builds automatically
ENV DEBIAN_FRONTEND=noninteractive

# Install all the compilers and runtimes in one massive command
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    python3 \
    nodejs \
    npm \
    default-jdk \
    php-cli \
    golang-go \
    ruby-full \
    && rm -rf /var/lib/apt/lists/*

# Install Rust (Rust uses a custom installer)
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Set up the default folder where code will run
WORKDIR /sandbox