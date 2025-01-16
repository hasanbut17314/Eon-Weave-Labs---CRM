import { useState } from "react"
import Button from "../../common/Button"
import { TbLogout } from "react-icons/tb";
import Card from "../../common/Card";
import { BarChartCard } from "@/components/common/BarChart";

export default function Dashboard() {

  const dataChart = [
    { month: "January", desktop: 186, mobile: 80 },
    { month: "February", desktop: 305, mobile: 200 },
    { month: "March", desktop: 237, mobile: 120 },
    { month: "April", desktop: 73, mobile: 190 },
    { month: "May", desktop: 209, mobile: 130 },
    { month: "June", desktop: 214, mobile: 140 },
  ];

  const bars = [
    {
      key: "desktop",
      label: "Desktop",
      color: "hsl(var(--chart-1))",
    },
    {
      key: "mobile",
      label: "Mobile",
      color: "hsl(var(--chart-2))",
    },
  ];

  const salesData = [
    {
      name: "Sarah Martins",
      sales: 50000,
      image: "https://avatar.iran.liara.run/public"
    },
    {
      name: "Mimi Martins",
      sales: 45000,
      image: "https://avatar.iran.liara.run/public"
    },
    {
      name: "Yogi Nu",
      sales: 42000,
      image: "https://avatar.iran.liara.run/public"
    },
    {
      name: "Akin Pianola",
      sales: 38000,
      image: "https://avatar.iran.liara.run/public"
    }
  ];

  interface person {
    name: string;
    sales: number;
    image: string;
  }

  const TopSalesPerson = ({ person }: { person: person }) => (
    <div className="flex flex-col items-center mb-8">
      <h2 className="text-xl mb-4">Most Sales</h2>
      <div className="relative mb-2">
        <img 
          src={person.image} 
          alt={person.name}
          className="w-24 h-24 rounded-full bg-yellow-300"
        />
        <div className="absolute bottom-0 right-0 w-6 h-6 bg-white rounded-full flex items-center justify-center">
          👑
        </div>
      </div>
      <p className="font-medium text-lg">{person.name}</p>
      <p className="text-xl font-bold">
        {person.sales.toLocaleString()}
      </p>
    </div>
  );
  const SalesPersonListItem = ({ person }: { person: person }) => (
    <div className="flex items-center gap-3 bg-white rounded-full p-2 mb-2 shadow-sm">
      <img 
        src={person.image} 
        alt={person.name}
        className="w-10 h-10 rounded-full"
      />
      <div className="flex justify-around w-full">
      <span className="font-medium">{person.name}</span>
      <span className="font-bold">{person.sales.toLocaleString()}</span>
      </div>
    </div>
  );

  const [name, setName] = useState("BDO")

  const sortedData = [...salesData].sort((a, b) => b.sales - a.sales);
  const topPerson = sortedData[0];
  const otherPeople = sortedData.slice(1);

  return (
    <div className="flex flex-col w-full items-center justify-center">

      <div className="top flex w-full mb-8 justify-between">
        <h1 className="text-4xl" onClick={() => setName("Name Updated")} >Hi,{name} </h1>
        <div className="flex gap-2">
          <Button title="Check In" onClick={() => console.log("CheckIn")} icon={<TbLogout size={20} />} />
          <Button title="Check Out" onClick={() => console.log("CheckOut")} icon={<TbLogout size={20} />} />
          <div className="profileBtn h-12 w-12 rounded-full bg-secondary"></div>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 md:grid-cols-3 grid-cols-1 gap-5">
        <Card data={{ icon: "👋", title: "Target", val: "35/50" }} />
        <Card data={{ icon: "👋", title: "Leads", val: "3" }} />
        <Card data={{ icon: "👋", title: "Overall Payment", val: "30k" }} />
        <Card data={{ icon: "👋", title: "Payment Approved", val: "20k" }} />
        <Card data={{ icon: "👋", title: "Payment Pending", val: "10k" }} />
      </div>

      <div className="mt-8 flex gap-4 w-[100%]">

      <div className="bg-card w-[70%] rounded-lg">

    <BarChartCard
      data={dataChart}
      title="Bar Chart - Multiple"
      description="January - June 2024"
      xAxisKey="month"
      bars={bars}
      className="bg-card text-white border-none"
      trendPercentage={5.2}
      footerText="Showing total visitors for the last 6 months"
    />
      </div>

      <div className="w-[30%]">
        <div className=" bg-card rounded-lg flex flex-col justify-between p-2 h-full">
        <TopSalesPerson person={topPerson} />
      <div className="space-y-2 mb-12 text-black">
        {otherPeople.map((person, index) => (
          <SalesPersonListItem key={index} person={person} />
        ))}
      </div>
        </div>
      </div>
      </div>

    </div>
  )
}
