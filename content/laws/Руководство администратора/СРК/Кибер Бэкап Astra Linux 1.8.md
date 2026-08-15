==**Установка и настройка средства резервного копирования Кибер Бэкап 18.6**==
**Необходимые пакеты**
Для установки программы требуются перечисленные ниже пакеты:
o       rpm;
o       gcc;
o       make;
o       linux-headers;
o       mokutil;
o       zstd;
o       libnss3.
команды для установки пакетов:
*sudo apt install rpm*
*sudo apt install gcc*
*sudo apt install make*
*sudo apt-get install linux-headers-`uname -r`*
*sudo apt-get install mokutil*
*sudo apt-get install zstd*
*sudo apt-get install libnss3*

Если ядро Astra Linux версии 5.10 и новее, то дополнительно нужно еще доустановить следующие пакеты:
o       flex;
o       bison.

команда для проверки версии ядра:
*sudo uname -r*

команды для установки пакетов:
*sudo apt install flex*
*sudo apt install bison*

Если используется Astra SE, пакеты необходимо установить с диска разработчика для текущей версии Astra.
Для разных операционных систем на основе Linux названия указанных пакетов могут отличаться.

**Подготовка СУБД PostgreSQL/Patroni**

Для корректной работы КиберБэкап необходима установка одной из предложенных вариантов СУБД:
o       PostgreSQL или Postgres Pro версии 14, 15, 16, 17, 18;
o       Platform V Pangolin SE 6.1.7;
o       СУБД Jatoba 5;
o       СУБД Tantor 14—17.

В качестве СУБД будет использоваться PostgreSQL.

Проверка доступных версий СУБД PostgreSQL для установки осуществляется командой:
*sudo apt police postgresql*

Установка PostgreSQL осуществляется пакетным менеджером apt и выполняется следующей командой:
*sudo apt install postgresql-15*

Где «15» - актуальная доступная версия СУБД

При установке сервера управления необходимо будет указать учетные данные пользователя с привилегиями LOGIN и SUPERUSER. От его имени будет настроена СУБД PostgreSQL. Если такой пользователь есть, можно использовать его учетные данные. Если такого пользователя нет, зайдите на машину с PostgreSQL от имени администратора и создайте его следующей командой:

*sudo -u postgres psql -c "CREATE ROLE cyberbackup WITH LOGIN SUPERUSER PASSWORD 'password';"*

После установки СУБД необходимо изменить параметры в конфигурационном файле postgres.conf командой:

*sudo nano /etc/postgresql/15/main/postgresql.conf*

_PostgreSQL и сервер управления на одной машине_

