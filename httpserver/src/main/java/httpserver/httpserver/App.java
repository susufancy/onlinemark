package httpserver.httpserver;

import java.io.*;
import java.net.*;
import java.util.StringTokenizer;

public class App implements Runnable {

    ServerSocket serverSocket;//服务器Socket
    public static int PORT=8080;//监听8080端口
    public String jpgname = "";
     // 开始服务器 Socket 线程.
    public App() {
        try {
            serverSocket=new ServerSocket(PORT);
        } catch(Exception e) {
            System.out.println("无法启动HTTP服务器:"+e.getLocalizedMessage());
        }
        if(serverSocket==null)  System.exit(1);//无法开始服务器
        new Thread(this).start();
        System.out.println("HTTP服务器正在运行,端口:"+PORT);
    }
    
     // 运行服务器主线程, 监听客户端请求并返回响应.
    public void run() {
        while(true) {
            try {
                Socket client=null;//客户Socket
                client=serverSocket.accept();//客户机(这里是 IE 等浏览器)已经连接到当前服务器
                if(client!=null) {
                    System.out.println("连接到服务器的用户:"+client);
                    try {
                        // 第一阶段: 打开输入流
                        BufferedReader in=new BufferedReader(new InputStreamReader(
                                client.getInputStream()));
                        
                        System.out.println("客户端发送的请求信息: ***************");
                        // 读取第一行, 请求地址
                        String line=in.readLine();
                        System.out.println(line);
                        String resource=line.substring(line.indexOf('/')+1,line.lastIndexOf('/')-5);
                        //获得请求的资源的地址
                        resource=URLDecoder.decode(resource, "UTF-8");//反编码 URL 地址
                        String method = new StringTokenizer(line).nextElement().toString();// 获取请求方法, GET 或者 POST

                        // 读取所有浏览器发送过来的请求参数头部信息
                        while( (line = in.readLine()) != null) {
//                            System.out.println(line);
                            if(line.equals("")) break;  //读到尾部即跳出
                        }
                        
                        System.out.println("请求信息结束 ***************");
                        System.out.println("用户请求的资源是:"+resource);
                        System.out.println("请求的类型是: " + method);
                        
                        //如果请求的是空则返回首页
                        if(resource.equals("")&&method.equals("GET")){
                            String ConTentType="Content-Type: text/html;charset=UTF-8"; //发送文本形式的首页
                            fileService("src/main/index.html",client,ConTentType);
                            closeSocket(client);
                        }
                        if(resource.endsWith(".jpg")&&method.equals("GET")) {
                        	
                        	String path = "src/main/images";		//要遍历的路径
                    		File file = new File(path);		//获取其file对象
                    		File[] fs = file.listFiles();	//遍历path下的文件和目录，放在File数组中
                    		for(File f:fs){					//遍历File[]数组
                    			System.out.println("snfijnig:  "+f.getName());
                    			if (f.getName().contains("jpg")) {
                    				String s = "src/main/marks/"+f.getName().substring(0,f.getName().indexOf('.'))+".txt";
                        			File ff = new File(s);
                        			System.out.println(s);
                        			if (!ff.exists()) {
                        				if (s != "src/main/marks/.txt")
                        				{
                        					jpgname = f.getName();
                            				System.out.println("jpgname:"+jpgname);
                        				}
                        			}
                    			}
                    			
                    		}
                    		System.out.println("jpgname:"+jpgname);
                        	
                            String ConTentType="Content-Type: image/jpg;charset=UTF-8";  //js的内容发送表明类型
                            fileService("src/main/images/"+jpgname, client,ConTentType);
                            closeSocket(client);
                            continue;
                        }
                        if(resource.endsWith(".message")&&method.equals("GET")) {
                        	String mess=resource.substring(0,resource.indexOf('.'));
                        	System.out.println("are you ok:"+mess);
                        	String[]  strs=mess.split(",");
                        	int l = strs.length/4;
                        	System.out.println("are you ok:"+l);
                        	FileWriter writer;
                            try {
                            	File file = new File("src/main/marks/"+jpgname.substring(0,jpgname.indexOf('.'))+".txt");
                            	file.createNewFile();
                            	writer = new FileWriter("src/main/marks/"+jpgname.substring(0,jpgname.indexOf('.'))+".txt");
                            	for (int i = 0;i < l;++i) {
                            		 writer.write(i+",");
                            		 writer.write(strs[i*4+0]);
                            		 writer.write(",");
                            		 writer.write(strs[i*4+1]);
                            		 writer.write(",");
                            		 writer.write(strs[i*4+2]);
                            		 writer.write(",");
                            		 writer.write(strs[i*4+3]);
                            		 writer.write("\n");
                                     
                            	}
                                
                                writer.flush();
                                writer.close();
                            } catch (IOException e) {
                                e.printStackTrace();
                            }
//                        	OutputStream os = new FileOutputStream("src/main/marks/"+jpgname.substring(0,jpgname.indexOf('.'))+".txt");
//                        	for (int i = 0;i < l;++i) {
//                        		os.write(strs[i]);
//                        	}
                            continue;
                        }
                        //如果请求的是js文件则按照js返回
                        if(resource.endsWith(".js")&&method.equals("GET")) {
                            String ConTentType="Content-Type: application/javascript;charset=UTF-8";  //js的内容发送表明类型
                            fileService("src/main/"+resource, client,ConTentType);
                            closeSocket(client);
                            continue;
                        }    
                    } catch(Exception e) {
                        System.out.println("HTTP服务器错误:"+e.getLocalizedMessage());
                    }
                }
                //System.out.println(client+"连接到HTTP服务器");//如果加入这一句,服务器响应速度会很慢
            } catch(Exception e) {
                System.out.println("HTTP服务器错误:"+e.getLocalizedMessage());
            }
        }
    }
    
    
     //关闭客户端 socket 并打印一条调试信息.
    void closeSocket(Socket socket) {
        try {
            socket.close();
        } catch (IOException ex) {
            ex.printStackTrace();
        }
        System.out.println(socket + "离开了HTTP服务器");        
    }
    
    /**
     * 读取一个文件的内容并返回给浏览器端.
     * @param fileName 文件名
     * @param socket 客户端 socket.
     */
    void fileService(String fileName, Socket socket,String ConTentType)
    {
        try
        {
        	System.out.println("Filename:" + fileName);
        	File fileToSend;
        	boolean status = fileName.contains("?");
        	System.out.println("bool:" + status);
        	if (status) {
        		String[] ff = fileName.split("\\?");
        		System.out.println("传送文件时出错:" + ff[0]);
        		fileToSend = new File(ff[0]);
        	}
        	else {
        		fileToSend = new File(fileName);
        	}
        	
        	
            PrintStream out = new PrintStream(socket.getOutputStream(), true);
            
            if(fileToSend.exists() && !fileToSend.isDirectory())
            {
                out.println("HTTP/1.0 200 OK");//返回应答消息,并结束应答
                out.println(ConTentType);   //返回文件的格式
                out.println("Content-Length: " + fileToSend.length());// 返回内容字节数
                out.println();// 根据 HTTP 协议, 空行将结束头信息

                FileInputStream fis = new FileInputStream(fileToSend);
                byte data[] = new byte[fis.available()];
                fis.read(data);
                out.write(data);
                out.close();
                fis.close();
            }
        }catch(Exception e){
            System.out.println("传送文件时出错:" + e.getLocalizedMessage());
        }
    }
    
    //命令行打印用途说明.
    private static void usage() {
        System.out.println("Usage: java HTTPServer <port> Default port is 80.");
    }
    
    /**
     * 启动简易 HTTP 服务器
     */
    public static void main(String[] args) {
        try {
            if(args.length != 1) {
                usage();
            } else if(args.length == 1) {
                PORT = Integer.parseInt(args[0]);
            }
        } catch (Exception ex) {
            System.err.println("Invalid port arguments. It must be a integer that greater than 0");
        }
        
        new App();   //创建一个
    }
}