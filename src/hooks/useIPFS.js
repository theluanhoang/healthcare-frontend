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

  return { ipfs, uploadFile, uploadJson };
};

export default useIpfs;