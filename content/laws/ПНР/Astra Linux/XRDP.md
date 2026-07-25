1. Становимся суперпользователем: sudo su
2. Обновим базы данных доступных пакетов: apt-get update
3. Установим и запустим RDP-сервер:
	apt -y install xrdp xorgxrdp
	systemctl enable xrdp
	systemctl start xrdp
4. Для того, чтобы можно было подключаться к серверу, откроем в межсетевом экране порт 3389/tcp: 
	ufw allow 3389/tcp
	ufw reload
5. Меняем настройки в конфигурационной файле /etc/xrdp/xrdp.ini

fork=false на fork=true

Если НЕ менять значение fork=false на fork=true, то при повторном подключении по xrdp без перезапуска этой службы - подключиться будет нельзя. Так же при значении fork=true при повторных подключениях, раннее открытое ПО не будет закрываться.

Затем отредактировать следующую часть и привести к ввиду:


;
; Session types
;

; Some session types such as Xorg, X11rdp and Xvnc start a display server.
; Startup command-line parameters for the display server are configured
; in sesman.ini. See and configure also sesman.ini.
[Xorg]
name=Xorg
lib=libxup.so
username=ask
password=ask
ip=127.0.0.1
port=-1
code=20

#[Xvnc]
#name=Xvnc
#lib=libvnc.so
#username=ask
#password=ask
#ip=127.0.0.1
#port=-1
#xserverbpp=24
#delay_ms=2000
; Disable requested encodings to support buggy VNC servers
; (1 = ExtendedDesktopSize)
#disabled_encodings_mask=0

Перезапустить службу xrdp: systemctl restart xrdp