export function truncateAddress(address: string, chars: number = 4): string {
    if (!address) return "";
    return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}