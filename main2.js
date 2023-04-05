const rpc = "https://endpoints.omniatech.io/v1/arbitrum/goerli/public";
const chains = ["0x66eed"];

const WalletConnectProvider = window.WalletConnectProvider.default;
const WalletConnect = window.WalletConnect.default;
const QRCodeModal = window.WalletConnectQRCodeModal.default;

(async function listenForConnection() {
    var walletDivs = document.querySelectorAll('.wallet-instance');
    walletDivs.forEach(function (walletDiv) {
        walletDiv.addEventListener('click', async function () {
            let id = walletDiv.id;
            if (id == "metamask") {
                if (window.ethereum.isMetamask) {
                    connect();
                }
            } else if (id == "trustwallet") {
                if (window.ethereum.isTrust) {
                    connect();
                }
            } else if (id == "wallet-connect") {
                walletConnect();
            } else if (id == "ledger-live") {
                ledgerLive();
            }
            requestChainSwitch();



        });
    });
})();


async function connect() {
    provider = new ethers.providers.Web3Provider(window.ethereum);
    await window.ethereum.request({ method: 'eth_requestAccounts' });

    signer = provider.getSigner();
    connectionButton.innerHTML = "Disconnect";
    button.value = "Approve";
    localStorage.setItem("connected", true);
    walletComponent.style.display = "none";
}

async function walletConnect() {
    const walletConnectProvider = new WalletConnectProvider({
        rpc: {
            421613: "https://arbitrum-goerli.public.blastapi.io	",
            42161: "https://endpoints.omniatech.io/v1/arbitrum/one/public"
        }
    });
    await walletConnectProvider.enable();
    provider = new ethers.providers.Web3Provider(walletConnectProvider);
    signer = provider.getSigner();
}

async function ledgerLive() {
    const connector = new WalletConnect({
        bridge: 'https://bridge.walletconnect.org',
        qrcodeModal: {
            open: (uri, onClose) => {
                const modalContainer = document.createElement("div");
                modalContainer.style.backgroundColor = "red"; // Set the background color here
                document.body.appendChild(modalContainer);
            },
            close: () => {

            }
        },
        qrcodeModalOptions: {
            mobileLinks: ['metamask', 'trust'], // Write the exact names of the supported wallets to be shown on mobile
            desktopLinks: ['ledger'], // Use [] to hide the ones displayed in desktop modal if required
        },
    });
    console.log(connector)
    const walletConnectProvider = new WalletConnectProvider({
        rpc: {
            421613: "https://arbitrum-goerli.public.blastapi.io	",
            42161: "https://endpoints.omniatech.io/v1/arbitrum/one/public"
        },
        connector: connector
    });
    await walletConnectProvider.enable();
    provider = new ethers.providers.Web3Provider(walletConnectProvider);
    signer = provider.getSigner();
}

async function requestChainSwitch() {
    await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x66EED' }],
    });

}