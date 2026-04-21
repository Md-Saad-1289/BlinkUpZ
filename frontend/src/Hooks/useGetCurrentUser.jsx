import { useEffect } from "react"
import axios from "axios"
import { useDispatch, useSelector } from "react-redux"
import { serverUrl } from "../config.js"
import { setUserData } from "../redux/userSlice"

const useGetCurrentUser = () => {
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);

  useEffect(() => {
    if (userData) return; // already have user data, skip

    const fetchUser = async () => {
      try {
        const res = await axios.get(`${serverUrl}/api/user/current`, {
          withCredentials: true,
        });
        dispatch(setUserData(res.data));
      } catch (err) {
        console.log("No active session: ", err);
      }
    };

    fetchUser();
  }, [userData, dispatch]);

  return userData; // return the current user data
};

export default useGetCurrentUser;
