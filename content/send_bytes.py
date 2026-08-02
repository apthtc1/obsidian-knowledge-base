#!/usr/bin/env python3
"""
Отправка заданной последовательности байт на удалённый хост по TCP или UDP.
Предназначено для тестирования сетевого детектирования (аналог EICAR для сети).
"""

import socket
import sys

# Последовательность байт для отправки
PAYLOAD = bytes.fromhex(
    "43 E5 BE 76 3F D9 0E 79 BA 3C FF D5 03 3B 9E DC "
    "28 FE C5 4B CB 7B D3 18 52 C6 21 3E D9 C9 E3 9A "
    "C5 AB 85 0A 40 B5 F6 BC 65 1E AC 9D 67 E5 21 82 "
    "CC 39 DB 07 71 F2 C2 86 F7 A4 77 D2 CA 7E 0E A2"
)


def ask(prompt, validator=None, default=None):
    while True:
        suffix = f" [{default}]" if default is not None else ""
        value = input(f"{prompt}{suffix}: ").strip()
        if not value and default is not None:
            value = str(default)
        if validator:
            try:
                return validator(value)
            except (ValueError, OSError) as e:
                print(f"  Неверное значение: {e}")
                continue
        return value


def valid_ip(value):
    # Разрешаем и IP, и hostname — проверяем через getaddrinfo
    socket.getaddrinfo(value, None)
    return value


def valid_port(value):
    port = int(value)
    if not (1 <= port <= 65535):
        raise ValueError("порт должен быть в диапазоне 1-65535")
    return port


def valid_proto(value):
    v = value.lower()
    if v in ("tcp", "udp"):
        return v
    raise ValueError("введите tcp или udp")


def send_tcp(host, port, data, timeout=10):
    with socket.create_connection((host, port), timeout=timeout) as s:
        s.sendall(data)
    return len(data)


def send_udp(host, port, data, timeout=10):
    # Определяем семейство адресов (IPv4/IPv6)
    info = socket.getaddrinfo(host, port, type=socket.SOCK_DGRAM)
    family, socktype, proto, _, sockaddr = info[0]
    with socket.socket(family, socktype, proto) as s:
        s.settimeout(timeout)
        sent = s.sendto(data, sockaddr)
    return sent


def main():
    print(f"К отправке {len(PAYLOAD)} байт.\n")

    host = ask("IP-адрес или имя хоста получателя", valid_ip)
    port = ask("Порт", valid_port)
    proto = ask("Протокол (tcp/udp)", valid_proto, default="tcp")

    print(f"\nОтправка {len(PAYLOAD)} байт на {host}:{port} по {proto.upper()}...")
    try:
        if proto == "tcp":
            sent = send_tcp(host, port, PAYLOAD)
        else:
            sent = send_udp(host, port, PAYLOAD)
    except (socket.timeout, OSError) as e:
        print(f"Ошибка отправки: {e}")
        sys.exit(1)

    print(f"Готово. Отправлено {sent} байт.")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nПрервано.")
        sys.exit(130)
