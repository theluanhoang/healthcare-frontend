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
      return cidString;
    } catch (error) {
      console.error("Lỗi tải lên IPFS:", error);
      throw error;
    }
  };

  return { ipfs, uploadFile };
};

export default useIpfs;