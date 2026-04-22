import { useEffect } from "react"
import api from "../api.js"
import { useDispatch, useSelector } from "react-redux"
import { setUserData } from "../redux/userSlice"

const useGetCurrentUser = () => {
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);

  useEffect(() => {
    if (userData) return; // already have user data, skip

    const fetchUser = async () => {
      try {
        const res = await api.get('/api/user/current');
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
