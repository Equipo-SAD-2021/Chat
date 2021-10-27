# Chat

Chat mediante protocolo websocket - Actividad 2

## Introducción 🚀

Este seminario forma parte de la asignatura de Servicios y Aplicaciones Distribuidas (SAD) impartida en el Máster Universitario en Ingeniería Informática de la UPV. En esta materia se presentan los principios, aproximaciones y tecnologías disponibles para el desarrollo de servicios y aplicaciones distribuidas. 

En concreto, gira alrededor de los _websockets_. Con esta herramienta se va a desarrollar un chat que contará con las siguientes funcionalidades:
* Distribuye un mensaje a todos los usuarios cada vez que alguien se conecta o desconecta
* Proporciona soporte nicknames
* Los mensajes del emisor no se reenvian a sí mismo
* Indica los usuarios que están escribiendo
* Cuenta con soporte para comandos:
  * `/help`: Proporciona información relativa a los comandos disponibles
  * `/users`: Permite comprobar la lista de usuarios conectados
  * `/msg (user) (message)`: Permite enviar mensajes privados


## Pre-requisitos 📋

El *software* necesario para ejecutar el proyecto es:

* **Node** - Entorno de ejecución utilizado que tambiér ara uso de los siguientes paquetes:
  * **socket.io** - Biblioteca para aplicaciones web en tiempo real. Permite la comunicación bidireccional entre clientes y servidores web
  * **express** - Componente backend diseñado para crear aplicaciones web y API, facilitando el uso de peticiones `get`

El cual se ha ejecutado en un entorno de desarrollo virtualizado construido con **Vagrant** utilizando **VirtualBox**. Este proceso se detallará en la **Instalación**.

## Instalación 🔧

Partiendo de los VagrantFiles que se nos proporcionó en la asignatura, establecemos una máquina Vagrant cuya configuración está disponible en el directorio `vagrant_config` del repositorio. Para poner esta máquina en funcionamiento se deben seguir los siguiente comandos:

Primero lanzamos el entorno dentro de la carpeta `vagrant_config`:
```
vagrant up
vagrant ssh
```

En este entorno se dispone de una carpeta compartida `/vagrant` que comunica el _host_ con la máquina virtual. Una vez iniciada la máquina, utilizaremos esta carpeta como directorio de trabajo, puesto que nos permitirá acceder desde los ficheros desde los dos puntos. Hecho esto, se instalarán los paquetes necesarios que aparecen en `package.json` mediante la siguiente intrucción:
```
npm install
```

Tras esta instrucción ya tenemos la instalación lista. 

Es importante mencionar que, aunque en el repositorio aparece la carpeta de `vagrant_config` al mismo nivel que los archivos de código para facilitar su organización, en la instalación local se debe tener el **contenido** de `vagrant_config` al mismo nivel que el código para poder disponer de este en `/vagrant`.


## Desarrollo 🛠️
El proyecto se compone de tres archivos diferentes: `index.js`, `login.html` y `chat.html`.

### index.js

Archivo JavaScript encargado de la parte del backend. En él se proporciona la vista adecuada y se procesan los eventos lanzandos en el frontend (archivos HTML).

### login.html

Archivo HTML con la estructura de la primera página de la aplicación. Permite enviar las peticiones necesarias al backend para poder unirse al chat. En caso de que el usuario elegido no esté disponible se muestra un aviso en esta ventana.

### chat.html

Archivo HTML con la estructura principal de la aplicación. Permite enviar las peticiones necesarias al backend para poder utilizar las funcionalidades del chat descritas en la **Introducción**.


## Comunicación en Node.js 🔀

Los _websockets_ definen un canal de comunicación _full-duplex_ que opera en la web a través de un único _socket_, objeto que está a la escucha de distintos eventos y nos permite desarrollar todas las acciones necesarias.


## Autores ✒️

* **Antonio Martínez Leal** - [AntonioM15](https://github.com/AntonioM15)
* **Pablo Moreira Flors** - [pabmoflo](https://github.com/pabmoflo)
* **Borja Sanz Gresa** - [BorjaSanz11](https://github.com/BorjaSanz11)


