import { create } from "ipfs-http-client";
import { useEffect, useState } from "react";
import { toast } from "react-toastify";

const ipfsConfig = {
  host: "localhost",
  port: 5001,
  protocol: "http",
};

const useIpfs = () => {
  const [ipfs, setIpfs] = useState(null);

  useEffect(() => {
    const initIpfs = async () => {
      try {
        const client = create(ipfsConfig);
        setIpfs(client);
        console.log("IPFS client initialized:", client);
      } catch (err) {
        console.error("IPFS initialization error:", err);
        toast.error("Không thể khởi tạo IPFS client.");
      }
    };

    initIpfs();
  }, []);

  // Upload File
  const uploadFile = async (file) => {
    if (!ipfs) throw new Error("IPFS client chưa được khởi tạo.");
    if (!(file instanceof File)) throw new Error("Tệp không hợp lệ, vui lòng chọn một tệp.");

    try {
      const buffer = await file.arrayBuffer();
      const fileData = new Uint8Array(buffer);
      const { cid } = await ipfs.add({ content: fileData, path: file.name });
      const cidString = cid.toString();
      if (!cidString) {
        throw new Error("Không thể lấy CID từ IPFS.");
      }
      console.log("File uploaded to IPFS, CID:", cidString);
      return cidString;
    } catch (error) {
      console.error("Lỗi tải lên IPFS:", error);
      throw error;
    }
  };

  // Upload JSON string
  const uploadJson = async (jsonData) => {
    if (!ipfs) throw new Error("IPFS client chưa được khởi tạo.");
    if (typeof jsonData !== "string") throw new Error("Dữ liệu JSON phải là chuỗi.");

    try {
      const { cid } = await ipfs.add(jsonData);
      const cidString = cid.toString();
      if (!cidString) {
        throw new Error("Không thể lấy CID từ IPFS.");
      }
      console.log("JSON uploaded to IPFS, CID:", cidString);
      return cidString;
    } catch (error) {
      console.error("Lỗi tải JSON lên IPFS:", error);
      throw error;
    }
  };

  // Get JSON data from IPFS
  const getJson = async (cid) => {
    if (!ipfs) throw new Error("IPFS client chưa được khởi tạo.");
    if (!cid) throw new Error("CID không được để trống.");

    try {
      console.log("Fetching JSON from IPFS, CID:", cid);
      const stream = ipfs.cat(cid);
      const chunks = [];
      
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      
      const data = new TextDecoder().decode(chunks.reduce((prev, curr) => {
        const temp = new Uint8Array(prev.length + curr.length);
        temp.set(prev);
        temp.set(curr, prev.length);
        return temp;
      }));

      console.log("JSON data fetched from IPFS:", data);
      return data;
    } catch (error) {
      console.error("Lỗi lấy dữ liệu từ IPFS:", error);
      throw error;
    }
  };

  // Get binary file from IPFS and return as Blob URL
  const getBinaryFile = async (cid) => {
    if (!ipfs) throw new Error("IPFS client chưa được khởi tạo.");
    if (!cid) throw new Error("CID không được để trống.");

    try {
      console.log("Fetching binary file from IPFS, CID:", cid);
      
      // Lấy dữ liệu từ IPFS dưới dạng Uint8Array
      let data = new Uint8Array(0);
      for await (const chunk of ipfs.cat(cid)) {
        const newData = new Uint8Array(data.length + chunk.length);
        newData.set(data);
        newData.set(chunk, data.length);
        data = newData;
      }

      // Kiểm tra xem có dữ liệu không
      if (data.length === 0) {
        throw new Error("Không có dữ liệu từ IPFS");
      }

      console.log("Received data length:", data.length);

      // Thử đoán MIME type từ vài bytes đầu tiên
      let mimeType = 'image/jpeg'; // default
      const signature = data.slice(0, 4);
      const header = Array.from(signature).map(byte => byte.toString(16).padStart(2, '0')).join('');
      
      // Kiểm tra signature của file
      if (header.startsWith('89504e47')) {
        mimeType = 'image/png';
      } else if (header.startsWith('ffd8')) {
        mimeType = 'image/jpeg';
      } else if (header.startsWith('47494638')) {
        mimeType = 'image/gif';
      }

      console.log("Detected MIME type:", mimeType);

      // Tạo blob với MIME type phù hợp
      const blob = new Blob([data], { type: mimeType });
      const url = URL.createObjectURL(blob);
      
      console.log("Binary file fetched from IPFS and converted to URL:", url);
      return url;
    } catch (error) {
      console.error("Lỗi khi lấy file từ IPFS:", error);
      throw error;
    }
  };

  return { ipfs, uploadFile, uploadJson, getJson, getBinaryFile };
};

export default useIpfs;